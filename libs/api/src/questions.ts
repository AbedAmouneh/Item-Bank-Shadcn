/**
 * Question API functions.
 *
 * Each function maps to one REST endpoint and delegates all HTTP mechanics
 * (credentials, CSRF, 401 retry) to `apiRequest` in ./client.
 */

import { apiRequest } from './client';

/** Server response envelope — every success response is wrapped in this. */
interface Envelope<T> {
  success: boolean;
  data: T;
}

/** A question as returned by the server. */
export interface Question {
  id: number;
  name: string;
  type: string;
  text?: string;
  mark?: number;
  status: string;
  item_bank_id?: number;
  tag_ids?: number[];
  content: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
}

/** Paginated list response returned by GET /questions. */
export interface QuestionsPage {
  items: Question[];
  total: number;
  page: number;
  limit: number;
}

/** Optional filters accepted by GET /questions. */
export interface GetQuestionsParams {
  page?: number;
  limit?: number;
  type?: string;
  status?: string;
  item_bank_id?: number;
  /** One or more tag IDs to filter by. Serialised as repeated `tag_ids[]=N` params. */
  tag_ids?: number[];
  search?: string;
}

/**
 * Fetch a paginated, optionally filtered list of questions.
 *
 * @param params - Optional query-string filters (page, limit, type, etc.).
 * @returns      A page of questions plus pagination metadata.
 */
export async function getQuestions(params?: GetQuestionsParams): Promise<QuestionsPage> {
  const query = new URLSearchParams();
  if (params?.page !== undefined) query.set('page', String(params.page));
  if (params?.limit !== undefined) query.set('limit', String(params.limit));
  if (params?.type !== undefined) query.set('type', params.type);
  if (params?.status !== undefined) query.set('status', params.status);
  if (params?.item_bank_id !== undefined) query.set('item_bank_id', String(params.item_bank_id));
  if (params?.tag_ids !== undefined) {
    params.tag_ids.forEach((id) => query.append('tag_ids[]', String(id)));
  }
  if (params?.search !== undefined) query.set('search', params.search);

  const qs = query.toString() ? `?${query.toString()}` : '';
  const envelope = await apiRequest<Envelope<QuestionsPage>>(`/questions${qs}`);
  return envelope.data;
}

/**
 * Fetch a single question by its numeric ID.
 *
 * @param id - The question's database ID.
 * @returns  The full question object.
 */
export async function getQuestion(id: number): Promise<Question> {
  const envelope = await apiRequest<Envelope<Question>>(`/questions/${id}`);
  return envelope.data;
}

/** Data required to create a new question. */
export interface CreateQuestionData {
  name: string;
  type: string;
  text?: string;
  mark?: number;
  item_bank_id?: number;
  tag_ids?: number[];
  content: Record<string, unknown>;
}

/**
 * Create a new question on the server.
 *
 * @param data - Fields for the new question.
 * @returns    The created question as persisted by the server.
 */
export async function createQuestion(data: CreateQuestionData): Promise<Question> {
  const envelope = await apiRequest<Envelope<Question>>('/questions', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return envelope.data;
}

/** Partial fields that can be updated on an existing question. */
export interface UpdateQuestionData {
  name?: string;
  text?: string;
  mark?: number;
  status?: 'draft' | 'in_review' | 'published';
  item_bank_id?: number;
  tag_ids?: number[];
  content?: Record<string, unknown>;
}

/**
 * Update one or more fields on an existing question.
 *
 * @param id   - The question's database ID.
 * @param data - The subset of fields to change.
 * @returns    The updated question.
 */
export async function updateQuestion(id: number, data: UpdateQuestionData): Promise<Question> {
  const envelope = await apiRequest<Envelope<Question>>(`/questions/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  return envelope.data;
}

/**
 * Permanently delete a question by ID.
 *
 * @param id - The question's database ID.
 */
export async function deleteQuestion(id: number): Promise<void> {
  await apiRequest<void>(`/questions/${id}`, { method: 'DELETE' });
}

/**
 * Submit a question for review, transitioning its status from Draft to In Review.
 *
 * @param id - The question's database ID.
 * @returns  The updated question with the new status.
 */
export async function submitForReview(id: number): Promise<Question> {
  const envelope = await apiRequest<Envelope<Question>>(`/questions/${id}/submit`, {
    method: 'POST',
  });
  return envelope.data;
}

/**
 * Upload an image file to the media store via multipart/form-data.
 *
 * Content-Type is intentionally not set here — the browser generates it
 * automatically and includes the required multipart boundary parameter.
 *
 * @param file - The image File object selected by the user.
 * @returns    An object containing the URL of the uploaded image.
 */
export async function uploadImage(file: File): Promise<{ url: string }> {
  const form = new FormData();
  form.append('file', file);
  const envelope = await apiRequest<Envelope<{ url: string }>>('/media/upload', {
    method: 'POST',
    body: form,
  });
  return envelope.data;
}

/**
 * Upload an image encoded as a base64 string.
 *
 * @param data     - The base64-encoded image data (without a data-URL prefix).
 * @param mimeType - The MIME type of the image (e.g. "image/png").
 * @returns        An object containing the URL of the uploaded image.
 */
export async function uploadImageBase64(data: string, mimeType: string): Promise<{ url: string }> {
  const envelope = await apiRequest<Envelope<{ url: string }>>('/media/upload/base64', {
    method: 'POST',
    body: JSON.stringify({ data, mimeType }),
  });
  return envelope.data;
}

/**
 * Reorder questions by their IDs.
 *
 * @param questionIds - Array of question IDs in the new desired order.
 */
export async function reorderQuestions(questionIds: number[]): Promise<void> {
  await apiRequest<void>('/questions/reorder', {
    method: 'PATCH',
    body: JSON.stringify({ question_ids: questionIds }),
  });
}

/**
 * Upload an audio file for a spelling dictation question.
 *
 * Content-Type must not be set manually — the browser adds the multipart
 * boundary automatically when the body is a FormData instance.
 *
 * @param id   - The question's database ID.
 * @param file - The audio File or Blob to upload.
 * @returns    The stored audioUrl and audioName.
 */
export async function uploadQuestionAudio(
  id: number,
  file: File | Blob,
): Promise<{ audioUrl: string; audioName: string }> {
  const form = new FormData();
  form.append('audio', file, file instanceof File ? file.name : 'recording.webm');
  const envelope = await apiRequest<Envelope<{ audioUrl: string; audioName: string }>>(
    `/questions/${id}/audio`,
    { method: 'POST', body: form },
  );
  return envelope.data;
}

/**
 * Delete the audio file attached to a spelling dictation question.
 *
 * @param id - The question's database ID.
 */
export async function deleteQuestionAudio(id: number): Promise<void> {
  await apiRequest<void>(`/questions/${id}/audio`, { method: 'DELETE' });
}

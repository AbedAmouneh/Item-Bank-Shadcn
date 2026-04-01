/**
 * Assessment API — all CRUD operations and question pool management.
 *
 * Every function talks to a specific REST endpoint and returns typed data.
 * Components never call fetch() directly — they always go through these functions.
 */

import type {
  Assessment,
  AssessmentsPage,
  AssessmentPoolQuestion,
  CreateAssessmentData,
  UpdateAssessmentData,
  GetAssessmentsParams,
  AddToPoolData,
} from '@item-bank/types';
import { apiRequest } from './client';

interface Envelope<T> {
  success: boolean;
  data: T;
}

// ─── List ────────────────────────────────────────────────────────────────────

/**
 * Fetch a paginated list of assessments for this tenant.
 * Supports filtering by status, type, and course_id.
 */
export async function getAssessments(
  params: GetAssessmentsParams = {},
): Promise<AssessmentsPage> {
  const qs = new URLSearchParams();
  if (params.page) qs.set('page', String(params.page));
  if (params.limit) qs.set('limit', String(params.limit));
  if (params.status) qs.set('status', params.status);
  if (params.type) qs.set('type', params.type);
  if (params.course_id) qs.set('course_id', String(params.course_id));

  const query = qs.toString() ? `?${qs.toString()}` : '';
  const envelope = await apiRequest<Envelope<AssessmentsPage>>(
    `/assessments${query}`,
  );
  return envelope.data;
}

// ─── Single ──────────────────────────────────────────────────────────────────

/**
 * Fetch a single assessment by ID.
 */
export async function getAssessment(id: number): Promise<Assessment> {
  const envelope = await apiRequest<Envelope<Assessment>>(
    `/assessments/${id}`,
  );
  return envelope.data;
}

// ─── Create ──────────────────────────────────────────────────────────────────

/**
 * Create a new assessment (exam or quiz).
 * Returns the newly created assessment record.
 */
export async function createAssessment(
  data: CreateAssessmentData,
): Promise<Assessment> {
  const envelope = await apiRequest<Envelope<Assessment>>('/assessments', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return envelope.data;
}

// ─── Update ──────────────────────────────────────────────────────────────────

/**
 * Update any fields on an existing assessment.
 * All fields are optional — only send what changed.
 */
export async function updateAssessment(
  id: number,
  data: UpdateAssessmentData,
): Promise<Assessment> {
  const envelope = await apiRequest<Envelope<Assessment>>(
    `/assessments/${id}`,
    {
      method: 'PATCH',
      body: JSON.stringify(data),
    },
  );
  return envelope.data;
}

// ─── Delete ──────────────────────────────────────────────────────────────────

/**
 * Delete an assessment permanently.
 * Only works on draft assessments (the backend enforces this).
 */
export async function deleteAssessment(id: number): Promise<void> {
  await apiRequest<void>(`/assessments/${id}`, { method: 'DELETE' });
}

// ─── Question pool ────────────────────────────────────────────────────────────

/**
 * Fetch the full list of questions currently in this assessment's pool.
 */
export async function getQuestionPool(
  assessmentId: number,
): Promise<AssessmentPoolQuestion[]> {
  const envelope = await apiRequest<Envelope<AssessmentPoolQuestion[]>>(
    `/assessments/${assessmentId}/pool`,
  );
  return envelope.data;
}

/**
 * Add one or more questions to an assessment's pool.
 * Duplicate question_ids are silently ignored by the backend.
 */
export async function addToPool(
  assessmentId: number,
  data: AddToPoolData,
): Promise<void> {
  await apiRequest<void>(`/assessments/${assessmentId}/pool`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Remove a single question from the pool.
 * Does NOT delete the question itself — just unlinks it from this assessment.
 */
export async function removeFromPool(
  assessmentId: number,
  questionId: number,
): Promise<void> {
  await apiRequest<void>(
    `/assessments/${assessmentId}/pool/${questionId}`,
    { method: 'DELETE' },
  );
}

/**
 * Courses & Activities API functions.
 *
 * Each function maps to one REST endpoint and delegates all HTTP mechanics
 * (credentials, CSRF, 401 retry) to `apiRequest` in ./client.
 */

import { apiRequest } from './client';

interface Envelope<T> {
  success: boolean;
  data: T;
}

// ── Types ──────────────────────────────────────────────────────────────────────

export type ActivityType = 'quiz' | 'survey' | 'practice_quiz' | 'pdf_book';
export type CourseStatus = 'draft' | 'published' | 'archived';

export interface Activity {
  id: number;
  course_id: number;
  type: ActivityType;
  title: string;
  description: string | null;
  position: number;
  settings: Record<string, unknown>;
  item_bank_id?: number;
  /** Denormalised name returned by the server for display. */
  item_bank_name?: string;
  /** Minutes allowed for quiz/practice_quiz activities. */
  time_limit_minutes?: number;
  /** Minimum percentage score to pass a quiz. */
  pass_score_percent?: number;
  /** Whether quiz questions are shuffled. */
  shuffle?: boolean;
  /** Storage URL for pdf_book activities. */
  file_url?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Fields that may be sent to PATCH/PUT an existing activity.
 * All fields are optional — only send what changed.
 */
export interface UpdateActivityData {
  title?: string;
  description?: string;
  position?: number;
  settings?: Record<string, unknown>;
  item_bank_id?: number;
  time_limit_minutes?: number;
  pass_score_percent?: number;
  shuffle?: boolean;
  file_url?: string;
}

/** A course object. `activities` is only populated on single-course fetches. */
export interface Course {
  id: number;
  title: string;
  description?: string;
  status: CourseStatus;
  activities?: Activity[];
  created_at?: string;
  updated_at?: string;
}

/** Course item as returned in list responses — includes activity_count but not the full activity array. */
export interface CourseSummary extends Omit<Course, 'activities'> {
  activity_count: number;
}

/** Paginated list returned by GET /courses. */
export interface CoursesPage {
  items: CourseSummary[];
  total: number;
  page: number;
  limit: number;
}

/** Payload for POST /courses. */
export interface CreateCourseData {
  title: string;
  description?: string;
  status?: CourseStatus;
  thumbnail_url?: string;
}

/** Payload for PUT /courses/:id — all fields optional. */
export interface UpdateCourseData {
  title?: string;
  description?: string;
  status?: CourseStatus;
  thumbnail_url?: string;
}

/** Payload for POST /courses/:id/activities. */
export interface CreateActivityData {
  type: ActivityType;
  title: string;
  description?: string;
  position?: number;
  settings?: Record<string, unknown>;
}

/** Query parameters accepted by GET /courses. */
export interface GetCoursesParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: CourseStatus;
}

export interface CourseAssignment {
  id: number;
  course_id: number;
  user_id: number;
  /** Denormalised user details returned by the server for display. */
  user: {
    id: number;
    name: string;
    email: string;
  };
  assigned_by: number | null;
  assigned_at: string;
  due_date: string | null;
}

/** Payload sent to POST /courses/:id/assignments. */
export interface AssignUserData {
  user_id: number;
  due_date?: string;
}

// ── Course functions ───────────────────────────────────────────────────────────

/** Fetch a paginated, filterable list of courses. */
export async function getCourses(params?: GetCoursesParams): Promise<CoursesPage> {
  const query = new URLSearchParams();
  if (params?.page !== undefined) query.set('page', String(params.page));
  if (params?.limit !== undefined) query.set('limit', String(params.limit));
  if (params?.search !== undefined) query.set('search', params.search);
  if (params?.status !== undefined) query.set('status', params.status);
  const qs = query.toString() ? `?${query.toString()}` : '';
  const envelope = await apiRequest<Envelope<CoursesPage>>(`/courses${qs}`);
  return envelope.data;
}

export async function createCourse(data: CreateCourseData): Promise<Course> {
  const envelope = await apiRequest<Envelope<Course>>('/courses', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return envelope.data;
}

export async function getCourse(id: number): Promise<Course> {
  const envelope = await apiRequest<Envelope<Course>>(`/courses/${id}`);
  return envelope.data;
}

export async function updateCourse(id: number, data: UpdateCourseData): Promise<Course> {
  const envelope = await apiRequest<Envelope<Course>>(`/courses/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  return envelope.data;
}

export async function deleteCourse(id: number): Promise<void> {
  await apiRequest<void>(`/courses/${id}`, { method: 'DELETE' });
}

// ── Activity functions ─────────────────────────────────────────────────────────

export async function createActivity(courseId: number, data: CreateActivityData): Promise<Activity> {
  const envelope = await apiRequest<Envelope<Activity>>(
    `/courses/${courseId}/activities`,
    { method: 'POST', body: JSON.stringify(data) }
  );
  return envelope.data;
}

export async function updateActivity(
  courseId: number,
  actId: number,
  data: UpdateActivityData,
): Promise<Activity> {
  const envelope = await apiRequest<Envelope<Activity>>(
    `/courses/${courseId}/activities/${actId}`,
    { method: 'PUT', body: JSON.stringify(data) }
  );
  return envelope.data;
}

export async function deleteActivity(courseId: number, actId: number): Promise<void> {
  await apiRequest<void>(`/courses/${courseId}/activities/${actId}`, { method: 'DELETE' });
}

export async function reorderActivities(
  courseId: number,
  orderedIds: number[],
): Promise<void> {
  await apiRequest<void>(`/courses/${courseId}/activities/reorder`, {
    method: 'PATCH',
    body: JSON.stringify({ ordered_ids: orderedIds }),
  });
}

// ── Assignment functions ───────────────────────────────────────────────────────

export async function getCourseAssignments(courseId: number): Promise<CourseAssignment[]> {
  const envelope = await apiRequest<Envelope<CourseAssignment[]>>(
    `/courses/${courseId}/assignments`
  );
  return envelope.data;
}

export async function assignUser(
  courseId: number,
  data: AssignUserData,
): Promise<CourseAssignment> {
  const envelope = await apiRequest<Envelope<CourseAssignment>>(
    `/courses/${courseId}/assignments`,
    { method: 'POST', body: JSON.stringify(data) },
  );
  return envelope.data;
}

export async function unassignUser(courseId: number, userId: number): Promise<void> {
  await apiRequest<void>(`/courses/${courseId}/assignments/${userId}`, { method: 'DELETE' });
}

// ── Media upload ───────────────────────────────────────────────────────────────

/**
 * Upload a file to the media endpoint and return the public URL.
 *
 * Used by ActivitySettingsPanel to let editors attach a PDF to a pdf_book activity.
 */
export async function uploadMedia(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  // uploadMedia sends multipart/form-data, so we call apiRequest without a
  // Content-Type header and let the browser set the boundary automatically.
  // The client's fetchRaw automatically strips Content-Type when body is FormData,
  // allowing the browser to set the multipart boundary itself.
  const envelope = await apiRequest<Envelope<{ url: string }>>('/media/upload', {
    method: 'POST',
    body: formData,
  });
  return envelope.data.url;
}

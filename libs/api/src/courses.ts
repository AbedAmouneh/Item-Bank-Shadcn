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
  created_at: string;
  updated_at: string;
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

/** Paginated list returned by GET /courses. */
export interface CoursesPage {
  items: Course[];
  total: number;
  page: number;
  limit: number;
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
  assigned_by: number | null;
  assigned_at: string;
  due_at: string | null;
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

export async function createCourse(data: {
  title: string;
  description?: string;
  status?: CourseStatus;
  thumbnail_url?: string;
}): Promise<Course> {
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

export async function updateCourse(
  id: number,
  data: {
    title?: string;
    description?: string;
    status?: CourseStatus;
    thumbnail_url?: string;
  },
): Promise<Course> {
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

export async function createActivity(
  courseId: number,
  data: {
    type: ActivityType;
    title: string;
    description?: string;
    position?: number;
    settings: Record<string, unknown>;
  },
): Promise<Activity> {
  const envelope = await apiRequest<Envelope<Activity>>(
    `/courses/${courseId}/activities`,
    { method: 'POST', body: JSON.stringify(data) }
  );
  return envelope.data;
}

export async function updateActivity(
  courseId: number,
  actId: number,
  data: {
    title?: string;
    description?: string;
    position?: number;
    settings?: Record<string, unknown>;
  },
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
  userId: number,
  dueAt?: string,
): Promise<CourseAssignment> {
  // Conditional spread avoids exactOptionalPropertyTypes error: never assign `undefined`
  // to an optional field — either include the key with a value or omit it entirely.
  const body: { user_id: number; due_at?: string } = {
    user_id: userId,
    ...(dueAt !== undefined ? { due_at: dueAt } : {}),
  };
  const envelope = await apiRequest<Envelope<CourseAssignment>>(
    `/courses/${courseId}/assignments`,
    { method: 'POST', body: JSON.stringify(body) }
  );
  return envelope.data;
}

export async function unassignUser(courseId: number, userId: number): Promise<void> {
  await apiRequest<void>(`/courses/${courseId}/assignments/${userId}`, { method: 'DELETE' });
}

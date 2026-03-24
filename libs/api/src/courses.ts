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
  created_at: string;
  updated_at: string;
}

export interface Course {
  id: number;
  title: string;
  description: string | null;
  status: CourseStatus;
  thumbnail_url: string | null;
  created_by: number | null;
  created_at: string;
  updated_at: string;
}

export interface CourseWithActivities extends Course {
  activities: Activity[];
}

/** Lightweight course summary used in list responses. */
export interface CourseSummary {
  id: number;
  title: string;
  description?: string;
  status: CourseStatus;
  activity_count: number;
  created_at?: string;
  updated_at?: string;
}

export interface CreateCourseData {
  title: string;
  description?: string;
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

/** Fetch all courses (flat list, no pagination for now). */
export async function getCourses(): Promise<CourseSummary[]> {
  const envelope = await apiRequest<Envelope<CourseSummary[]>>('/courses');
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

export async function getCourse(id: number): Promise<CourseWithActivities> {
  const envelope = await apiRequest<Envelope<CourseWithActivities>>(`/courses/${id}`);
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

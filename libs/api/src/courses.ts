/**
 * Courses API functions.
 *
 * Each function maps to one REST endpoint and delegates HTTP mechanics
 * to `apiRequest` in ./client.
 */

import { apiRequest } from './client';

// ─── Shared response envelope ──────────────────────────────────────────────
interface Envelope<T> {
  success: boolean;
  data: T;
}

// ─── Domain types ──────────────────────────────────────────────────────────

/** Status of a course: not yet published vs. live for learners. */
export type CourseStatus = 'draft' | 'published';

/** The four supported activity types. */
export type ActivityType = 'quiz' | 'survey' | 'practice_quiz' | 'pdf_book';

/** A single activity within a course. */
export interface Activity {
  id: number;
  type: ActivityType;
  title: string;
  description?: string;
  /** 1-based display position in the course. */
  position: number;
  /** Linked item bank id — Quiz / Practice Quiz only. */
  item_bank_id?: number;
  /** Denormalised name returned by the server for display. */
  item_bank_name?: string;
  /** Optional cap in minutes — Quiz / Practice Quiz only. */
  time_limit_minutes?: number;
  /** 0–100 pass threshold — Quiz / Practice Quiz only. */
  pass_score_percent?: number;
  /** Whether questions are shuffled — Quiz / Practice Quiz only. */
  shuffle?: boolean;
  /** Hosted URL of the PDF — PDF Book only. */
  file_url?: string;
}

/** A full course including its ordered activities. */
export interface Course {
  id: number;
  title: string;
  description?: string;
  status: CourseStatus;
  activities: Activity[];
  created_at?: string;
  updated_at?: string;
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

/** A user assigned to a course. */
export interface CourseAssignment {
  id: number;
  user: {
    id: number;
    name: string;
    email: string;
  };
  due_date?: string;
}

// ─── Request payloads ──────────────────────────────────────────────────────

export interface CreateCourseData {
  title: string;
  description?: string;
}

export interface UpdateCourseData {
  title?: string;
  description?: string;
  status?: CourseStatus;
}

export interface CreateActivityData {
  type: ActivityType;
  title: string;
  description?: string;
  item_bank_id?: number;
  time_limit_minutes?: number;
  pass_score_percent?: number;
  shuffle?: boolean;
  file_url?: string;
}

export interface UpdateActivityData {
  title?: string;
  description?: string;
  item_bank_id?: number;
  time_limit_minutes?: number;
  pass_score_percent?: number;
  shuffle?: boolean;
  file_url?: string;
}

export interface AssignUserData {
  user_id: number;
  due_date?: string;
}

// ─── API functions ─────────────────────────────────────────────────────────

/** Fetch all courses (flat list, no pagination for now). */
export async function getCourses(): Promise<CourseSummary[]> {
  const envelope = await apiRequest<Envelope<CourseSummary[]>>('/courses');
  return envelope.data;
}

/** Fetch a single course with its full activity list. */
export async function getCourse(id: number): Promise<Course> {
  const envelope = await apiRequest<Envelope<Course>>(`/courses/${id}`);
  return envelope.data;
}

/** Create a new course. Returns the created course with its generated id. */
export async function createCourse(data: CreateCourseData): Promise<Course> {
  const envelope = await apiRequest<Envelope<Course>>('/courses', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return envelope.data;
}

/** Update title, description, or status of an existing course. */
export async function updateCourse(id: number, data: UpdateCourseData): Promise<Course> {
  const envelope = await apiRequest<Envelope<Course>>(`/courses/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  return envelope.data;
}

/** Permanently delete a course. */
export async function deleteCourse(id: number): Promise<void> {
  await apiRequest<void>(`/courses/${id}`, { method: 'DELETE' });
}

/** Append a new activity to a course. */
export async function createActivity(
  courseId: number,
  data: CreateActivityData,
): Promise<Activity> {
  const envelope = await apiRequest<Envelope<Activity>>(
    `/courses/${courseId}/activities`,
    { method: 'POST', body: JSON.stringify(data) },
  );
  return envelope.data;
}

/** Update one or more fields on an existing activity. */
export async function updateActivity(
  courseId: number,
  activityId: number,
  data: UpdateActivityData,
): Promise<Activity> {
  const envelope = await apiRequest<Envelope<Activity>>(
    `/courses/${courseId}/activities/${activityId}`,
    { method: 'PUT', body: JSON.stringify(data) },
  );
  return envelope.data;
}

/** Delete an activity from a course. */
export async function deleteActivity(courseId: number, activityId: number): Promise<void> {
  await apiRequest<void>(`/courses/${courseId}/activities/${activityId}`, {
    method: 'DELETE',
  });
}

/**
 * Persist a new activity order.
 *
 * @param courseId   - The course whose activities are being reordered.
 * @param orderedIds - Activity ids in the desired new order (1-indexed positions inferred server-side).
 */
export async function reorderActivities(
  courseId: number,
  orderedIds: number[],
): Promise<Activity[]> {
  const envelope = await apiRequest<Envelope<Activity[]>>(
    `/courses/${courseId}/activities/reorder`,
    { method: 'PUT', body: JSON.stringify({ ordered_ids: orderedIds }) },
  );
  return envelope.data;
}

/** List all users assigned to a course. */
export async function getCourseAssignments(courseId: number): Promise<CourseAssignment[]> {
  const envelope = await apiRequest<Envelope<CourseAssignment[]>>(
    `/courses/${courseId}/assignments`,
  );
  return envelope.data;
}

/** Assign a user to a course with an optional due date. */
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

/** Remove a user from a course. */
export async function unassignUser(courseId: number, userId: number): Promise<void> {
  await apiRequest<void>(`/courses/${courseId}/assignments/${userId}`, {
    method: 'DELETE',
  });
}

/**
 * Upload a file (PDF) to the media service.
 *
 * @returns The hosted URL of the uploaded file.
 */
export async function uploadMedia(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  const envelope = await apiRequest<Envelope<{ url: string }>>('/media/upload', {
    method: 'POST',
    body: formData,
  });
  return envelope.data.url;
}

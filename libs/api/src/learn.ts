/**
 * Learner API functions.
 *
 * Each function maps to one backend endpoint and delegates all HTTP mechanics
 * (credentials, CSRF, 401 retry) to apiRequest in ./client.
 *
 * NOTE: The /learn/* endpoints are built in Batch 5A. Until then these
 * functions will throw on 404 — callers (hooks) surface isError gracefully.
 */

import { apiRequest } from './client';
import type { MyLearningData, LearnerCourse, CourseModule } from '@item-bank/types';

interface Envelope<T> {
  success: boolean;
  data: T;
}

/**
 * Fetch the current learner's dashboard data: courses, exams, and assignments.
 *
 * @returns Aggregated learner data for the My Learning dashboard.
 */
export async function getMyLearning(): Promise<MyLearningData> {
  const envelope = await apiRequest<Envelope<MyLearningData>>('/learn/dashboard');
  return envelope.data;
}

/**
 * Fetch a single course with its full module list.
 *
 * The LearnerCourse type does not carry modules; this endpoint extends it
 * with a modules array for the course player. Do not add modules to LearnerCourse.
 *
 * @param courseId - Numeric course identifier from the URL param.
 * @returns The course data plus an ordered array of its modules.
 */
export async function getLearnerCourse(
  courseId: number,
): Promise<LearnerCourse & { modules: CourseModule[] }> {
  const envelope = await apiRequest<Envelope<LearnerCourse & { modules: CourseModule[] }>>(
    `/learn/courses/${courseId}`,
  );
  return envelope.data;
}

/**
 * Mark a specific module as complete for the current learner.
 *
 * On success the server updates completed and potentially locked on
 * adjacent modules. Invalidate the learner-course query after calling this.
 *
 * @param courseId  - Numeric course identifier.
 * @param moduleId  - Numeric module identifier.
 * @returns { ok: true } on success.
 */
export async function completeModule(
  courseId: number,
  moduleId: number,
): Promise<{ ok: true }> {
  const envelope = await apiRequest<Envelope<{ ok: true }>>(
    `/learn/courses/${courseId}/modules/${moduleId}/complete`,
    { method: 'POST' },
  );
  return envelope.data;
}

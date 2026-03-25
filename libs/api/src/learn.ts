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
import type {
  MyLearningData,
  LearnerCourse,
  CourseModule,
  AssessmentBrief,
  AttemptSession,
  AttemptResult,
} from '@item-bank/types';

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

/**
 * Fetch the pre-exam briefing for one assessment: title, time limit,
 * passing score, remaining attempts, and anti-cheat flag.
 *
 * @param assessmentId - Numeric assessment identifier from the URL param.
 * @returns AssessmentBrief data.
 */
export async function getAssessmentBrief(assessmentId: number): Promise<AssessmentBrief> {
  const envelope = await apiRequest<Envelope<AssessmentBrief>>(
    `/learn/assessments/${assessmentId}/brief`,
  );
  return envelope.data;
}

/**
 * Start a new attempt for the given assessment.
 * The server validates attempt limits and returns the full question list
 * with a deadline timestamp (or null when there is no time limit).
 *
 * @param assessmentId - Numeric assessment identifier.
 * @returns AttemptSession including questions and deadline_at.
 */
export async function startAttempt(assessmentId: number): Promise<AttemptSession> {
  const envelope = await apiRequest<Envelope<AttemptSession>>(
    `/learn/assessments/${assessmentId}/attempts`,
    { method: 'POST' },
  );
  return envelope.data;
}

/**
 * Persist one answer for the current attempt.
 * Call this on every answer change (debounced 800 ms) and immediately
 * before advancing to the next question.
 *
 * @param attemptId  - Numeric attempt identifier.
 * @param questionId - Numeric question identifier.
 * @param answer     - Serialisable answer value (string, number, etc.).
 */
export async function saveAnswer(
  attemptId: number,
  questionId: number,
  answer: unknown,
): Promise<void> {
  await apiRequest<void>(
    `/learn/attempts/${attemptId}/answers/${questionId}`,
    {
      method: 'PUT',
      body: JSON.stringify({ answer }),
    },
  );
}

/**
 * Submit the attempt and receive the graded result.
 * After this call the attempt is closed — no further saves are accepted.
 *
 * @param attemptId - Numeric attempt identifier.
 * @returns Graded AttemptResult.
 */
export async function submitAttempt(attemptId: number): Promise<AttemptResult> {
  const envelope = await apiRequest<Envelope<AttemptResult>>(
    `/learn/attempts/${attemptId}/submit`,
    { method: 'POST' },
  );
  return envelope.data;
}

/**
 * Fetch a previously graded attempt result (for ExamResultsPage and
 * AnswerReviewPage when the learner navigates back via URL).
 *
 * @param attemptId - Numeric attempt identifier.
 * @returns Graded AttemptResult.
 */
export async function getAttemptResult(attemptId: number): Promise<AttemptResult> {
  const envelope = await apiRequest<Envelope<AttemptResult>>(
    `/learn/attempts/${attemptId}/result`,
  );
  return envelope.data;
}

/**
 * Log an anti-cheat violation (tab switch, copy, fullscreen exit).
 * This is fire-and-forget — callers should not await or surface errors.
 *
 * @param attemptId    - Numeric attempt identifier.
 * @param violationType - One of 'tab_switch' | 'copy_paste' | 'fullscreen_exit'.
 */
export async function logViolation(
  attemptId: number,
  violationType: string,
): Promise<void> {
  await apiRequest<void>(
    `/learn/attempts/${attemptId}/violations`,
    {
      method: 'POST',
      body: JSON.stringify({ type: violationType }),
    },
  );
}

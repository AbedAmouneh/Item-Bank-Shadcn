/**
 * Learner-facing data types.
 *
 * These are the shapes the server sends to the client for the My Learning
 * dashboard and course player. All fields mirror the API contract exactly.
 */

/** A course assigned to the learner, as returned by GET /learn/dashboard. */
export interface LearnerCourse {
  id: number;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  /** Server-computed completion percentage: 0–100. */
  progress_percent: number;
  status: 'not_started' | 'in_progress' | 'completed';
  /** ISO-8601 date string or null when no deadline is set. */
  due_date: string | null;
  module_count: number;
  modules_completed: number;
  /** ID of the linked exam (for post-completion banner). Null if none. */
  exam_id: number | null;
}

/** An exam assigned to the learner. */
export interface LearnerExam {
  id: number;
  title: string;
  /** Duration in minutes. Null means no time limit. */
  time_limit_mins: number | null;
  question_count: number;
  max_attempts: number;
  attempts_used: number;
  passing_score_percent: number;
  /** Null when the learner has never attempted the exam. */
  last_score: number | null;
  /** Null when the learner has never attempted the exam. */
  last_passed: boolean | null;
  due_date: string | null;
  status: 'not_started' | 'in_progress' | 'completed';
}

/** An assignment given to the learner. */
export interface LearnerAssignment {
  id: number;
  title: string;
  due_date: string | null;
  submitted_at: string | null;
  graded_at: string | null;
  score: number | null;
  max_score: number;
  status: 'not_submitted' | 'draft' | 'submitted' | 'graded';
}

/** Top-level payload returned by GET /learn/dashboard. */
export interface MyLearningData {
  courses: LearnerCourse[];
  exams: LearnerExam[];
  assignments: LearnerAssignment[];
}

/**
 * A single module inside a learner's course.
 * locked and completed are server-controlled — never derive them on the client.
 */
export interface CourseModule {
  id: number;
  title: string;
  /** 1-based display order. Not guaranteed to be gapless. */
  position: number;
  /** TinyMCE-authored HTML. Always sanitize with DOMPurify before rendering. */
  content: string;
  completed: boolean;
  /** True when the previous module has not yet been completed. */
  locked: boolean;
}

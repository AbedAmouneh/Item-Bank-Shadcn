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
 * Summary data shown on the PreExamPage before the learner starts.
 * Returned by GET /learn/assessments/:id/brief.
 */
export interface AssessmentBrief {
  id: number;
  title: string;
  description: string | null;
  /** Duration in minutes. Null means no time limit. */
  time_limit_mins: number | null;
  question_count: number;
  passing_score_percent: number;
  max_attempts: number;
  attempts_used: number;
  /** Server-computed: max_attempts - attempts_used, clamped to 0. */
  attempts_remaining: number;
  anti_cheat_enabled: boolean;
}

/** Content shape for a single question returned inside AttemptSession. */
export interface ExamQuestionContent {
  text: string;
  choices?: { id: string; text: string }[];
  /** Shown in answer review when available. */
  explanation?: string;
}

/** A single question as served during an active exam attempt. */
export interface ExamQuestion {
  id: number;
  /** 1-based display order. */
  position: number;
  type: string;
  content: ExamQuestionContent;
  /** Maximum points this question is worth. */
  points: number;
}

/**
 * The learner's answer to one question.
 * Stored as { type, value } so the server can decode by question type.
 */
export interface QuestionAnswer {
  type: string;
  value: unknown;
}

/**
 * Returned by POST /learn/assessments/:id/attempts.
 * Contains everything ExamPage needs to run without further API calls.
 */
export interface AttemptSession {
  attempt_id: number;
  assessment_id: number;
  /** ISO-8601 string, or null when there is no time limit. */
  deadline_at: string | null;
  questions: ExamQuestion[];
}

/** Per-question breakdown inside AttemptResult. */
export interface AttemptResultQuestion {
  id: number;
  position: number;
  type: string;
  content: ExamQuestionContent;
  learner_answer: QuestionAnswer | null;
  correct_answer: QuestionAnswer;
  is_correct: boolean;
  points_awarded: number;
  points_possible: number;
}

/**
 * Full result returned by POST /learn/attempts/:id/submit
 * and GET /learn/attempts/:id/result.
 */
export interface AttemptResult {
  attempt_id: number;
  assessment_id: number;
  score_percent: number;
  passed: boolean;
  correct_count: number;
  total_count: number;
  /** Seconds elapsed from attempt start to submission. */
  time_taken_seconds: number;
  attempt_number: number;
  attempts_remaining: number;
  questions: AttemptResultQuestion[];
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

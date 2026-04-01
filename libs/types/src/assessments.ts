/**
 * Shared types for the assessment (exam/quiz) domain.
 *
 * These are the shapes the backend returns and the frontend sends.
 * Kept in libs/types so every lib can import them without circular deps.
 */

export type AssessmentType = 'quiz' | 'exam';
export type AssessmentStatus = 'draft' | 'published' | 'archived';

/** Full assessment record returned by GET /assessments and GET /assessments/:id. */
export interface Assessment {
  id: number;
  title: string;
  description: string | null;
  type: AssessmentType;
  status: AssessmentStatus;
  course_id: number | null;
  time_limit_mins: number | null;
  max_attempts: number;
  passing_score_percent: number;
  question_count: number;
  randomize_questions: boolean;
  anti_cheat_enabled: boolean;
  created_at: string;
  updated_at: string;
}

/** One question inside an assessment's question pool. */
export interface AssessmentPoolQuestion {
  question_id: number;
  name: string;
  type: string;
  added_at: string;
}

/** Paginated list response from GET /assessments. */
export interface AssessmentsPage {
  items: Assessment[];
  total: number;
  page: number;
  limit: number;
}

/** Body for POST /assessments. */
export interface CreateAssessmentData {
  title: string;
  description?: string;
  type?: AssessmentType;
  course_id?: number;
  time_limit_mins?: number;
  max_attempts?: number;
  passing_score_percent?: number;
  question_count?: number;
  randomize_questions?: boolean;
  anti_cheat_enabled?: boolean;
  status?: AssessmentStatus;
}

/** Body for PATCH /assessments/:id — every field is optional. */
export type UpdateAssessmentData = Partial<CreateAssessmentData>;

/** Query params for GET /assessments. */
export interface GetAssessmentsParams {
  page?: number;
  limit?: number;
  status?: AssessmentStatus;
  type?: AssessmentType;
  course_id?: number;
}

/** Body for POST /assessments/:id/pool. */
export interface AddToPoolData {
  question_ids: number[];
}

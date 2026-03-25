/**
 * Shared TypeScript interfaces, DTOs, and constants.
 *
 * This library sits at the bottom of the dependency order — every other lib
 * may import from it, but it may not import from any other @item-bank/* lib.
 */

import type { Role } from './roles';

export {
  PLATFORM_ROLES,
  AUTHORING_ROLES,
  ALL_AUTHORING_ROLES,
  LEARNER_ROLE,
} from './roles';
export type { PlatformRole, AuthoringRole, LearnerRole, AppRole, Role } from './roles';

export type {
  LearnerCourse,
  LearnerExam,
  LearnerAssignment,
  MyLearningData,
  CourseModule,
  AssessmentBrief,
  ExamQuestionContent,
  ExamQuestion,
  QuestionAnswer,
  AttemptSession,
  AttemptResultQuestion,
  AttemptResult,
} from './learn';

/** The authenticated user shape used throughout the app. */
export interface AuthUser {
  id: string;
  email: string;
  /**
   * @deprecated Kept for NavBar backward compatibility only.
   * All new guard and UI logic must read from `roles`.
   * Remove once NavBar is updated to consume `roles` directly.
   */
  role: Role;
  /** Multi-role array — the primary source of truth for all guard and UI logic. */
  roles: string[];
  /** Organisation tenant identifier (integer). */
  tenant_id: number;
  is_active: boolean;
}

export type {
  Tenant,
  TenantStatus,
  TenantPlan,
  PlatformStats,
  TenantsPage,
  CreateTenantData,
  CreateTenantResponse,
  UpdateTenantData,
  TenantUser,
  TenantUsage,
  GetTenantsParams,
} from './platform';

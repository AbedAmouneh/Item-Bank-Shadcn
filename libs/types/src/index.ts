/**
 * Shared TypeScript interfaces, DTOs, and constants.
 *
 * This library sits at the bottom of the dependency order — every other lib
 * may import from it, but it may not import from any other @item-bank/* lib.
 */

export {
  PLATFORM_ROLES,
  AUTHORING_ROLES,
  ALL_AUTHORING_ROLES,
  LEARNER_ROLE,
} from './roles';
export type { PlatformRole, AuthoringRole, LearnerRole, AppRole } from './roles';

export type {
  LearnerCourse,
  LearnerExam,
  LearnerAssignment,
  MyLearningData,
  CourseModule,
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
  role: 'admin' | 'user';
  /** Multi-role array — the primary source of truth for all guard and UI logic. */
  roles: string[];
  /** Organisation tenant identifier (integer). */
  tenant_id: number;
  is_active: boolean;
}

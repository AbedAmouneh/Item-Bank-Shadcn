/** Role constants — single source of truth for all role strings in the app. */

export const PLATFORM_ROLES = ['super_admin', 'sales'] as const;
export const AUTHORING_ROLES = ['org_admin', 'author', 'reviewer'] as const;
export const ALL_AUTHORING_ROLES = [...AUTHORING_ROLES, 'admin', 'user'] as const;
export const LEARNER_ROLE = 'learner' as const;

export type PlatformRole = typeof PLATFORM_ROLES[number];
export type AuthoringRole = typeof AUTHORING_ROLES[number];
export type LearnerRole = typeof LEARNER_ROLE;
export type AppRole = PlatformRole | AuthoringRole | LearnerRole;

/** All roles the backend can assign — covers every value returned by the API. */
export type Role = typeof ALL_AUTHORING_ROLES[number] | PlatformRole | LearnerRole;

import { Navigate, Outlet } from 'react-router-dom';

import { ALL_AUTHORING_ROLES, LEARNER_ROLE, PLATFORM_ROLES } from '@item-bank/types';

import { useAuth } from '../hooks/useAuth';

/**
 * Route guard for the authoring world.
 *
 * Checks:
 *  1. While loading → renders null (suppresses redirect flash on cold boot).
 *  2. Not authenticated → /login.
 *  3. Learner-only (roles is non-empty and every role is 'learner') → /learn/dashboard.
 *  4. Platform-only (has a platform role but no authoring role) → /platform/dashboard.
 *  5. Otherwise → <Outlet /> (the AuthoringShell picks up from here).
 */
const AuthoringRoute = () => {
  const { isLoading, isAuthenticated, user } = useAuth();

  if (isLoading) return null;
  if (!isAuthenticated) return <Navigate replace to="/login" />;

  const roles = user?.roles ?? [];
  const isLearnerOnly =
    roles.length > 0 && roles.every((r) => r === LEARNER_ROLE);
  const isPlatformOnly =
    roles.some((r) => (PLATFORM_ROLES as readonly string[]).includes(r)) &&
    !roles.some((r) => (ALL_AUTHORING_ROLES as readonly string[]).includes(r));

  if (isLearnerOnly) return <Navigate replace to="/learn/dashboard" />;
  if (isPlatformOnly) return <Navigate replace to="/platform/dashboard" />;

  return <Outlet />;
};

export default AuthoringRoute;

import { Navigate, Outlet } from 'react-router-dom';

import { LEARNER_ROLE } from '@item-bank/types';

import { useAuth } from '../hooks/useAuth';

/**
 * Route guard for the learner world.
 *
 * Checks:
 *  1. While loading → renders null.
 *  2. Not authenticated → /login.
 *  3. No 'learner' role → /dashboard.
 *  4. Otherwise → <Outlet /> (the LearnerShell picks up from here).
 */
const LearnerRoute = () => {
  const { isLoading, isAuthenticated, user } = useAuth();

  if (isLoading) return null;
  if (!isAuthenticated) return <Navigate replace to="/login" />;

  const hasLearnerRole = user?.roles.includes(LEARNER_ROLE) ?? false;
  if (!hasLearnerRole) return <Navigate replace to="/dashboard" />;

  return <Outlet />;
};

export default LearnerRoute;

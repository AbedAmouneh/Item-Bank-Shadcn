import { Navigate, Outlet } from 'react-router-dom';

import { useAuth } from '../hooks/useAuth';

const PLATFORM_ROLES = ['super_admin', 'sales'];

/**
 * Route guard for the platform world.
 *
 * Checks:
 *  1. While loading → renders null.
 *  2. Not authenticated → /login.
 *  3. No platform role (super_admin or sales) → /dashboard.
 *  4. Otherwise → <Outlet /> (the PlatformShell picks up from here).
 */
const PlatformRoute = () => {
  const { isLoading, isAuthenticated, user } = useAuth();

  if (isLoading) return null;
  if (!isAuthenticated) return <Navigate replace to="/login" />;

  const hasPlatformRole = user?.roles.some((r) => PLATFORM_ROLES.includes(r)) ?? false;
  if (!hasPlatformRole) return <Navigate replace to="/dashboard" />;

  return <Outlet />;
};

export default PlatformRoute;

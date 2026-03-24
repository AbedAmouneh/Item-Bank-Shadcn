import type { ReactNode } from 'react';

import { Navigate } from 'react-router-dom';

import { useAuth } from '../hooks/useAuth';

interface RequireRoleProps {
  /** At least one of these roles must be present in user.roles. */
  roles: string[];
  children: ReactNode;
}

/**
 * Fine-grained role gate used inside the authoring world.
 *
 * Unlike the route-level guards (AuthoringRoute etc.), this component wraps
 * individual route elements rather than acting as a layout route wrapper.
 * It does not handle the loading/unauthenticated cases — those are already
 * handled by the parent AuthoringRoute.
 */
const RequireRole = ({ roles, children }: RequireRoleProps) => {
  const { user } = useAuth();

  const hasRole = user?.roles.some((r) => roles.includes(r)) ?? false;
  if (!hasRole) return <Navigate replace to="/dashboard" />;

  return <>{children}</>;
};

export default RequireRole;

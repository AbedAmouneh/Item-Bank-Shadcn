import { Navigate, Outlet } from 'react-router-dom';

import { useAuth } from '../hooks/useAuth';

const GuestRoute = () => {
  const { isLoading, isAuthenticated } = useAuth();

  // Suppress any flash of a redirect while the initial getMe() call is in flight.
  if (isLoading) return null;

  if (isAuthenticated) return <Navigate replace to="/home" />;

  return <Outlet />;
};

export default GuestRoute;

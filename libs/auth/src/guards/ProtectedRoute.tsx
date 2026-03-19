import { Navigate, Outlet } from 'react-router-dom';

import { NavBar } from '@item-bank/ui';

import { useAuth } from '../hooks/useAuth';

const ProtectedRoute = () => {
  const { isLoading, isAuthenticated } = useAuth();

  // Suppress any flash of a redirect while the initial getMe() call is in flight.
  if (isLoading) return null;

  if (!isAuthenticated) return <Navigate replace to="/login" />;

  return (
    <div className="w-full min-w-0 overflow-hidden">
      <NavBar
        notifications={[]}
        onMarkNotificationAsRead={(_id) => {}}
        onMarkAllNotificationsAsRead={() => {}}
      />
      <Outlet />
    </div>
  );
};

export default ProtectedRoute;

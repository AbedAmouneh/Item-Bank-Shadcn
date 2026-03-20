import { useCallback } from 'react';

import { useNavigate, Navigate, Outlet } from 'react-router-dom';

import { logout } from '@item-bank/api';
import { NavBar } from '@item-bank/ui';

import { useAuth } from '../hooks/useAuth';

const ProtectedRoute = () => {
  const { isLoading, isAuthenticated, clearSession, user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = useCallback(async () => {
    try {
      await logout();
    } finally {
      // Always clear local session state even if the network request fails,
      // so the user is never stuck in a logged-in state client-side.
      clearSession();
      navigate('/login', { replace: true });
    }
  }, [clearSession, navigate]);

  // Suppress any flash of a redirect while the initial getMe() call is in flight.
  if (isLoading) return null;

  if (!isAuthenticated) return <Navigate replace to="/login" />;

  return (
    <div className="w-full min-w-0 overflow-hidden">
      <NavBar
        notifications={[]}
        onMarkNotificationAsRead={(_id) => {}}
        onMarkAllNotificationsAsRead={() => {}}
        onLogout={handleLogout}
        userRole={user?.role}
      />
      <Outlet />
    </div>
  );
};

export default ProtectedRoute;

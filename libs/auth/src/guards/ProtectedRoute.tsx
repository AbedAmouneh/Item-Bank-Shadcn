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

  // Derive display values from the email local-part (the only name field available).
  const emailLocal = (user?.email ?? '').split('@')[0];
  const userName = emailLocal;
  const userInitials = emailLocal.slice(0, 2).toUpperCase();

  return (
    <div className="w-full min-w-0 overflow-hidden">
      <NavBar
        notifications={[]}
        onMarkNotificationAsRead={(_id) => {}}
        onMarkAllNotificationsAsRead={() => {}}
        onLogout={handleLogout}
        userRole={user?.role}
        userName={userName}
        userInitials={userInitials}
      />
      <Outlet />
    </div>
  );
};

export default ProtectedRoute;

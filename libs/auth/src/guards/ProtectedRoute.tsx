import { useCallback } from 'react';

import { useNavigate, Navigate, Outlet } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import {
  logout,
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  type Notification as ApiNotification,
} from '@item-bank/api';
import { NavBar, type Notification as UiNotification } from '@item-bank/ui';

import { useAuth } from '../hooks/useAuth';

/** Maps an API entity type + id to an in-app deep-link path. */
function entityHref(type: string | undefined, id: number | undefined): string | undefined {
  if (!type || !id) return undefined;
  if (type === 'question') return `/home?question=${id}`;
  if (type === 'course') return `/projects/${id}`;
  if (type === 'item_bank') return `/item-banks/${id}`;
  return undefined;
}

/** Converts an API Notification (snake_case, numeric id) to the UI Notification shape. */
function toUiNotification(n: ApiNotification): UiNotification {
  return {
    id: String(n.id),
    title: n.title,
    message: n.body ?? '',
    createdAt: n.created_at,
    read: n.is_read,
    href: entityHref(n.entity_type, n.entity_id),
  };
}

const ProtectedRoute = () => {
  const { isLoading, isAuthenticated, clearSession, user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

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

  // Poll unread count every 30 s — lightweight request just for the badge.
  const unreadQuery = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: getUnreadCount,
    refetchInterval: 30_000,
    enabled: isAuthenticated,
  });

  // Full notification list — also refreshed every 30 s for the popover.
  const notifsQuery = useQuery({
    queryKey: ['notifications'],
    queryFn: getNotifications,
    refetchInterval: 30_000,
    enabled: isAuthenticated,
  });

  const markReadMutation = useMutation({
    mutationFn: (id: number) => markAsRead(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAllMutation = useMutation({
    mutationFn: markAllAsRead,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  // Suppress any flash of a redirect while the initial getMe() call is in flight.
  if (isLoading) return null;

  if (!isAuthenticated) return <Navigate replace to="/login" />;

  // Derive display values from the email local-part (the only name field available).
  const emailLocal = (user?.email ?? '').split('@')[0];
  const userName = emailLocal;
  const userInitials = emailLocal.slice(0, 2).toUpperCase();

  const uiNotifications: UiNotification[] = (notifsQuery.data ?? []).map(toUiNotification);

  return (
    <div className="w-full min-w-0 overflow-hidden">
      <NavBar
        notifications={uiNotifications}
        unreadCount={unreadQuery.data?.count ?? 0}
        onMarkNotificationAsRead={(id) => markReadMutation.mutate(Number(id))}
        onMarkAllNotificationsAsRead={() => markAllMutation.mutate()}
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

import { useCallback } from 'react';

import { useNavigate, Outlet } from 'react-router-dom';
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
import { useAuth } from '@item-bank/auth';

/** Maps an API entity type + id to an in-app deep-link path. */
function entityHref(
  type: string | undefined,
  id: number | undefined,
): string | undefined {
  if (!type || !id) return undefined;
  if (type === 'question') return `/home?question=${id}`;
  if (type === 'course') return `/projects/${id}`;
  if (type === 'item_bank') return `/item-banks/${id}`;
  return undefined;
}

/** Converts an API Notification to the UI Notification shape. */
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

/**
 * Navigation shell for the authoring world.
 *
 * Renders the top NavBar with notifications, theme controls, and logout.
 * Conditionally shows a "Switch to Learning" button for dual-role users.
 * Contains zero redirect logic — that lives in AuthoringRoute.
 */
export default function AuthoringShell() {
  const { user, clearSession } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const handleLogout = useCallback(async () => {
    try {
      await logout();
    } finally {
      clearSession();
      navigate('/login', { replace: true });
    }
  }, [clearSession, navigate]);

  const handleSwitchToLearn = useCallback(() => {
    localStorage.setItem('last-mode', 'learn');
    navigate('/learn/dashboard');
  }, [navigate]);

  // Poll unread count every 30 s — lightweight request just for the badge.
  const unreadQuery = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: getUnreadCount,
    refetchInterval: 30_000,
  });

  // Full notification list — also refreshed every 30 s for the popover.
  const notifsQuery = useQuery({
    queryKey: ['notifications'],
    queryFn: getNotifications,
    refetchInterval: 30_000,
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

  const emailLocal = (user?.email ?? '').split('@')[0];
  const uiNotifications: UiNotification[] = (notifsQuery.data ?? []).map(
    toUiNotification,
  );
  // Only dual-role users (authoring + learner) see the switch button.
  const isLearnerToo = user?.roles.includes('learner') ?? false;

  return (
    <div className="w-full min-w-0 overflow-hidden">
      <NavBar
        notifications={uiNotifications}
        unreadCount={unreadQuery.data?.count ?? 0}
        onMarkNotificationAsRead={(id) =>
          markReadMutation.mutate(Number(id))
        }
        onMarkAllNotificationsAsRead={() => markAllMutation.mutate()}
        onLogout={handleLogout}
        userRole={user?.role}
        userName={emailLocal}
        userInitials={emailLocal.slice(0, 2).toUpperCase()}
        onSwitchToLearn={isLearnerToo ? handleSwitchToLearn : undefined}
      />
      <Outlet />
    </div>
  );
}

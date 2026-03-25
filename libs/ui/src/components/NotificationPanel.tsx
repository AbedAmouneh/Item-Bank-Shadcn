import type { MouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Bell } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import { cn, navIconBtnClass } from '../lib/utils';
import type { Notification } from '../types/Notification';

/**
 * Returns a sentinel string encoding the relative time for an ISO 8601 timestamp.
 * Callers pass the result to renderTime() which translates it via i18n.
 *   'just_now'   → < 60 seconds
 *   '<N>_min'    → < 60 minutes  (N is the number of minutes)
 *   '<N>_hr'     → < 24 hours    (N is the number of hours)
 *   'DD/MM/YYYY' → absolute date for older items
 */
function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return 'just_now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}_min`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}_hr`;
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

export interface NotificationPanelProps {
  notifications: Notification[];
  /** Number of unread notifications. Used for the badge on the bell icon. */
  unreadCount: number;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
}

/**
 * Bell-button popover showing the notifications list.
 * The PopoverTrigger (the bell button) is owned here so NavBar simply renders
 * <NotificationPanel> with no additional wrapping button or tooltip.
 */
export function NotificationPanel({
  notifications,
  unreadCount,
  onMarkAsRead,
  onMarkAllAsRead,
}: NotificationPanelProps) {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const allRead = unreadCount === 0;

  /** Translates the sentinel string from formatRelativeTime into a display string. */
  function renderTime(iso: string): string {
    const raw = formatRelativeTime(iso);
    if (raw === 'just_now') return t('notifications.just_now');
    if (raw.endsWith('_min')) {
      // Extract the numeric part before the '_min' suffix
      const count = parseInt(raw.split('_')[0], 10);
      return t('notifications.minutes_ago', { count });
    }
    if (raw.endsWith('_hr')) {
      // Extract the numeric part before the '_hr' suffix
      const count = parseInt(raw.split('_')[0], 10);
      return t('notifications.hours_ago', { count });
    }
    // Absolute date — already formatted as DD/MM/YYYY
    return raw;
  }

  function handleRowClick(notification: Notification) {
    onMarkAsRead(notification.id);
    if (notification.href) {
      navigate(notification.href);
    }
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={navIconBtnClass}
          aria-label={t('table_actions.notifications')}
        >
          <span className="relative">
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -end-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-none text-destructive-foreground">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </span>
        </button>
      </PopoverTrigger>

      <PopoverContent className="w-80 p-0" align="end">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <span className="font-semibold text-sm text-foreground">
            {t('notifications.title')}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={onMarkAllAsRead}
            disabled={allRead}
            className="text-xs h-7 px-2"
          >
            {t('notifications.mark_all_as_read')}
          </Button>
        </div>

        {/* Notification list or empty state */}
        <div className="overflow-y-auto max-h-[420px]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-10 text-muted-foreground">
              <Bell size={28} strokeWidth={1.5} />
              <span className="text-sm font-medium">
                {t('notifications.empty_title')}
              </span>
              <span className="text-xs">{t('notifications.empty_message')}</span>
            </div>
          ) : (
            notifications.map((notification, index) => {
              const rowClass = cn(
                'w-full text-start flex items-start gap-3 px-4 py-3 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                notification.read
                  ? 'border-s-2 border-transparent'
                  : 'border-s-2 border-primary'
              );

              const rowContent = (
                <>
                  {/* Unread indicator dot */}
                  <span
                    className={cn(
                      'mt-1.5 shrink-0 w-2 h-2 rounded-full bg-primary transition-opacity',
                      notification.read ? 'opacity-0' : 'opacity-100'
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground leading-snug truncate">
                      {notification.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      {notification.message}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {renderTime(notification.createdAt)}
                    </p>
                  </div>
                </>
              );

              return (
                <div key={notification.id}>
                  {notification.href ? (
                    <a
                      href={notification.href}
                      aria-label={notification.title}
                      onClick={(e: MouseEvent<HTMLAnchorElement>) => {
                        e.preventDefault();
                        handleRowClick(notification);
                      }}
                      className={rowClass}
                    >
                      {rowContent}
                    </a>
                  ) : (
                    <button
                      type="button"
                      aria-label={notification.title}
                      onClick={() => handleRowClick(notification)}
                      className={rowClass}
                    >
                      {rowContent}
                    </button>
                  )}
                  {index < notifications.length - 1 && (
                    <Separator className="ms-4 me-4 w-auto" />
                  )}
                </div>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

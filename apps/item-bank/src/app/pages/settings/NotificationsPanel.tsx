import { useTranslation } from 'react-i18next';
import { Badge } from '@item-bank/ui';

type NotificationRowProps = {
  title: string;
  description: string;
  comingSoonLabel: string;
};

/** A single disabled notification-toggle row with a "Coming soon" badge. */
function NotificationRow({ title, description, comingSoonLabel }: NotificationRowProps) {
  return (
    <div className="flex items-center justify-between gap-4 p-4 rounded-xl border border-border bg-card opacity-60">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <Badge variant="secondary">{comingSoonLabel}</Badge>
        {/* Decorative disabled toggle — not interactive */}
        <div
          className="w-11 h-6 rounded-full bg-muted border border-border"
          aria-hidden="true"
        />
      </div>
    </div>
  );
}

/** Notifications settings panel — placeholder for future notification toggles. */
export default function NotificationsPanel() {
  const { t } = useTranslation('common');
  const comingSoon = t('settings.coming_soon');

  return (
    <div className="max-w-xl flex flex-col gap-4">
      <h2 className="text-base font-semibold text-foreground">
        {t('settings.tab_notifications')}
      </h2>
      <NotificationRow
        title={t('settings.notif_email')}
        description={t('settings.notif_email_desc')}
        comingSoonLabel={comingSoon}
      />
      <NotificationRow
        title={t('settings.notif_push')}
        description={t('settings.notif_push_desc')}
        comingSoonLabel={comingSoon}
      />
    </div>
  );
}

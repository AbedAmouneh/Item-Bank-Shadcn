import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Palette, User, Bell, Settings as SettingsIcon } from 'lucide-react';
import { Sidebar, type SidebarItem } from '@item-bank/ui';
import AppearancePanel from './settings/AppearancePanel';
import AccountPanel from './settings/AccountPanel';
import NotificationsPanel from './settings/NotificationsPanel';

type SettingsTab = 'appearance' | 'account' | 'notifications';

/**
 * Settings page — two-column layout (sidebar + panel) matching the Profile page style.
 * All tab navigation is handled via local state; no sub-routes are needed.
 */
export default function Settings() {
  const { t } = useTranslation('common');
  const [activeTab, setActiveTab] = useState<SettingsTab>('appearance');

  const tabs: SidebarItem[] = [
    {
      id: 'appearance',
      label: t('settings.tab_appearance'),
      icon: Palette,
      selected: activeTab === 'appearance',
      onClick: () => setActiveTab('appearance'),
    },
    {
      id: 'account',
      label: t('settings.tab_account'),
      icon: User,
      selected: activeTab === 'account',
      onClick: () => setActiveTab('account'),
    },
    {
      id: 'notifications',
      label: t('settings.tab_notifications'),
      icon: Bell,
      selected: activeTab === 'notifications',
      onClick: () => setActiveTab('notifications'),
    },
  ];

  const header = (
    <div className="flex items-center gap-3 p-4">
      <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 shrink-0">
        <SettingsIcon size={20} className="text-primary" />
      </div>
      <div>
        <p className="font-semibold text-[0.9375rem] leading-[1.3] text-foreground">
          {t('settings.title')}
        </p>
        <p className="text-[0.8125rem] text-muted-foreground">
          {t('settings.subtitle')}
        </p>
      </div>
    </div>
  );

  return (
    <Sidebar header={header} items={tabs}>
      <main className="flex-1 p-6 bg-background overflow-y-auto">
        {activeTab === 'appearance' && <AppearancePanel />}
        {activeTab === 'account' && <AccountPanel />}
        {activeTab === 'notifications' && <NotificationsPanel />}
      </main>
    </Sidebar>
  );
}

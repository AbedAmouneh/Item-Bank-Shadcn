// libs/profile/src/components/ProfileSidebar.tsx
import { UserCircle, Lock, Folder, FileEdit } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Sidebar, type SidebarItem } from '@item-bank/ui';

export default function ProfileSidebar() {
  const { t } = useTranslation('common');
  const location = useLocation();
  const selectedId = location.pathname.split('/')[2] || 'edit';
  const navigate = useNavigate();

  const items: SidebarItem[] = [
    {
      id: 'edit',
      label: t('profile.edit_profile'),
      icon: UserCircle,
      selected: selectedId === 'edit',
      onClick: () => navigate('/profile/edit'),
    },
    {
      id: 'change-password',
      label: t('profile.change_password'),
      icon: Lock,
      selected: selectedId === 'change-password',
      onClick: () => navigate('/profile/change-password'),
    },
    {
      id: 'file-manager',
      label: t('profile.file_manager'),
      icon: Folder,
      selected: selectedId === 'file-manager',
      onClick: () => navigate('/profile/file-manager'),
    },
    {
      id: 'my-annotations',
      label: t('profile.my_annotations'),
      icon: FileEdit,
      selected: selectedId === 'my-annotations',
      onClick: () => navigate('/profile/my-annotations'),
    },
  ];

  const header = (
    <div className="flex items-center p-4 gap-4">
      {/* Avatar circle — replaces MUI Avatar + StyledAvatar */}
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: 'hsl(var(--avatar-background))' }}
      >
        <UserCircle className="w-7 h-7 text-primary" />
      </div>

      {/* User info */}
      <div className="min-w-0">
        <p className="font-medium text-[0.9375rem] leading-[1.3] text-foreground truncate">
          {t('profile.username_placeholder')}
        </p>
        <p className="text-[0.8125rem] text-muted-foreground truncate">
          {t('profile.role_admin')}
        </p>
      </div>
    </div>
  );

  return <Sidebar header={header} items={items}><Outlet /></Sidebar>;
}

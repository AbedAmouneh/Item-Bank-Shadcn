// libs/profile/src/components/ProfileSidebar.tsx
import { Avatar, Box, Typography } from '@mui/material';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import LockIcon from '@mui/icons-material/Lock';
import FolderIcon from '@mui/icons-material/Folder';
import EditNoteIcon from '@mui/icons-material/EditNote';
import { useTranslation } from 'react-i18next';
import { styled } from '@mui/material/styles';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Sidebar, type SidebarItem } from '@item-bank/ui';

const StyledAvatar = styled(Avatar)(({ theme }) => ({
  backgroundColor: theme.palette.semantic.avatar.background,
}));

export default function ProfileSidebar() {
  const { t } = useTranslation('common');
  const location = useLocation();
  const selectedId = location.pathname.split('/')[2] || 'edit';
  const navigate = useNavigate();

  const items: SidebarItem[] = [
    {
      id: 'edit',
      label: t('profile.edit_profile'),
      icon: PersonOutlineIcon,
      selected: selectedId === 'edit',
      onClick: () => navigate('/profile/edit'),
    },
    {
      id: 'change-password',
      label: t('profile.change_password'),
      icon: LockIcon,
      selected: selectedId === 'change-password',
      onClick: () => navigate('/profile/change-password'),
    },
    {
      id: 'file-manager',
      label: t('profile.file_manager'),
      icon: FolderIcon,
      selected: selectedId === 'file-manager',
      onClick: () => navigate('/profile/file-manager'),
    },
    {
      id: 'my-annotations',
      label: t('profile.my_annotations'),
      icon: EditNoteIcon,
      selected: selectedId === 'my-annotations',
      onClick: () => navigate('/profile/my-annotations'),
    },
  ];

  const header = (
    <Box className="flex items-center p-4 gap-4">
      <StyledAvatar className="w-12 h-12" />
      <Box className="min-w-0">
        <Typography
          className="font-medium leading-[1.3]"
          sx={(theme) => ({ color: theme.palette.text.primary })}
          variant="subtitle1"
        >
          {t('profile.username_placeholder')}
        </Typography>
        <Typography
          className="text-[0.8125rem]"
          sx={(theme) => ({ color: theme.palette.text.secondary })}
          variant="body2"
        >
          {t('profile.role_admin')}
        </Typography>
      </Box>
    </Box>
  );

  return <Sidebar header={header} items={items}><Outlet /></Sidebar>;
}

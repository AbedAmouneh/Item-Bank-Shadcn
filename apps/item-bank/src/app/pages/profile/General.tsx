import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  Box,
  Typography,
  TextField,
  Button,
  Stack,
  IconButton,
  ButtonGroup,
  Menu,
  MenuItem,
  Divider,
  alpha,
  styled,
} from '@mui/material';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import CloseIcon from '@mui/icons-material/Close';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import { useTranslation } from 'react-i18next';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const createProfileSchema = (t: (key: string) => string) => z.object({
  firstName: z.string().min(1, t('profile.field_required')),
  lastName: z.string().min(1, t('profile.field_required')),
  username: z.string(),
  phoneNumber: z.string(),
  email: z.string(),
});

type ProfileFormValues = {
  firstName: string;
  lastName: string;
  username: string;
  phoneNumber: string;
  email: string;
};

const defaultValues: ProfileFormValues = {
  firstName: '',
  lastName: '',
  username: 'john.smith',
  phoneNumber: '',
  email: 'johm.smith@sayeghonline.com',
};

const CardBox = styled(Box)(({ theme }) => ({
  backgroundColor: theme.palette.semantic.surface.card,
  border: `1px solid ${theme.palette.semantic.border.card}`,
}));

const AvatarZoneRoot = styled(Box)(({ theme }) => ({
  backgroundColor: theme.palette.semantic.surface.input,
  border: `2px dashed ${alpha(theme.palette.divider, 0.6)}`,
  '&:hover': {
    borderColor: theme.palette.primary.main,
    backgroundColor: alpha(theme.palette.primary.main, 0.04),
  },
}));

const HoverOverlay = styled(Box)(({ theme }) => ({
  backgroundColor: alpha(theme.palette.background.default, 0.85),
  [`${AvatarZoneRoot}:hover &`]: {
    opacity: 1,
    pointerEvents: 'auto',
  },
}));

const RemoveButton = styled(IconButton)(({ theme }) => ({
  backgroundColor: theme.palette.error.main,
  color: theme.palette.error.contrastText,
  '&:hover': {
    backgroundColor: theme.palette.error.dark,
  },
}));

const StyledTextField = styled(TextField)(({ theme }) => ({
  '& .MuiOutlinedInput-root': {
    backgroundColor: theme.palette.semantic.surface.input,
    '&.Mui-disabled': {
      backgroundColor: alpha(theme.palette.action.disabledBackground, 0.5),
    },
  },
}));

const General = () => {
  const { t } = useTranslation('common');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [saveMenuAnchor, setSaveMenuAnchor] = useState<null | HTMLElement>(null);

  const profileSchema = createProfileSchema(t);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues,
  });

  const handleAvatarClick = () => fileInputRef.current?.click();
  const handleAvatarRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    setProfileImage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setProfileImage(url);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file?.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setProfileImage(url);
    }
  };

  const handleDragOver = (e: React.DragEvent) => e.preventDefault();

  const onSave = handleSubmit((data) => {
    console.log('Save profile', data);
    setSaveMenuAnchor(null);
  });
  const openSaveMenu = (e: React.MouseEvent<HTMLElement>) => setSaveMenuAnchor(e.currentTarget);
  const closeSaveMenu = () => setSaveMenuAnchor(null);

  return (
    <Box className='flex-1 min-w-0 p-6 flex justify-center items-start' sx={(theme) => ({backgroundColor: theme.palette.background.default})}>
      <CardBox className='w-full rounded-[12px] p-6 shadow-md'>
        <Box className='flex items-center gap-3 mb-4'>
          <PersonOutlineIcon sx={{ color: 'primary.main', fontSize: 28 }} />
          <Typography className='font-semibold text-xl' sx={(theme) => ({color: theme.palette.primary.main})} variant="h6">{t('profile.edit_profile')}</Typography>
        </Box>

        <Divider className="mx-0" />

        <Box className='flex gap-8 mt-6 flex-wrap'>
          <AvatarZoneRoot
          className='cursor-pointer flex items-center justify-center relative w-[200px] h-[200px] shrink-0 rounded-full overflow-hidden transition-colors duration-200'
          onClick={handleAvatarClick}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          role="button"
          aria-label={t('profile.upload_profile_picture')}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            style={{ display: 'none' }}
            aria-hidden
          />
          {profileImage ? (
            <Box
              component="img"
              src={profileImage}
              alt="Profile"
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <Box className='flex flex-col items-center justify-center gap-3 p-4'>
              <AddPhotoAlternateIcon sx={{ fontSize: 56, color: 'text.secondary' }} />
            </Box>
          )}
          {profileImage && (
            <RemoveButton
            className='absolute top-2 right-2 z-10 w-8 h-8'
              size="small"
              onClick={handleAvatarRemove}
              aria-label={t('profile.remove_photo')}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <CloseIcon fontSize="small" />
            </RemoveButton>
          )}
          <HoverOverlay className='opacity-0 transition-opacity duration-200 pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 p-4'>
            <AddPhotoAlternateIcon sx={{ fontSize: 48, color: 'text.secondary' }} />
            <Typography variant="body2" color="text.secondary" textAlign="center" className="px-2">
              {t('profile.drag_and_drop')}
            </Typography>
            <Button
              variant="contained"
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                handleAvatarClick();
              }}
            >
              {t('profile.browse')}
            </Button>
          </HoverOverlay>
        </AvatarZoneRoot>

        <form className='flex-1 min-w-[280px] flex flex-col' onSubmit={onSave}>
          <Stack className='flex-1' spacing={2.5}>
            <Box className='flex gap-4' sx={{ '& > *': { flex: 1 } }}>
              <StyledTextField
                label={t('profile.first_name')}
                fullWidth
                error={!!errors.firstName}
                helperText={errors.firstName?.message}
                {...register('firstName')}
              />
              <StyledTextField
                label={t('profile.last_name')}
                fullWidth
                error={!!errors.lastName}
                helperText={errors.lastName?.message}
                {...register('lastName')}
              />
            </Box>
            <StyledTextField
              label={t('profile.username')}
              fullWidth
              disabled
              {...register('username')}
            />
            <StyledTextField
              label={t('profile.phone_number')}
              fullWidth
              {...register('phoneNumber')}
            />
            <StyledTextField
              label={t('profile.email')}
              fullWidth
              disabled
              {...register('email')}
            />
          </Stack>

          <Divider className="mx-0" />


          <Box className='flex items-center flex-wrap gap-3 mt-4'>
            <Button variant="outlined" color="primary">
              {t('profile.cancel')}
            </Button>
            <ButtonGroup variant="contained" color="primary">
              <Button onClick={onSave}>{t('profile.save')}</Button>
              <Button
                size="small"
                onClick={openSaveMenu}
                aria-controls={saveMenuAnchor ? 'save-menu' : undefined}
                aria-haspopup="true"
                aria-expanded={saveMenuAnchor ? 'true' : undefined}
              >
                <KeyboardArrowDownIcon />
              </Button>
            </ButtonGroup>
            <Menu
              id="save-menu"
              anchorEl={saveMenuAnchor}
              open={Boolean(saveMenuAnchor)}
              onClose={closeSaveMenu}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
              <MenuItem onClick={closeSaveMenu}>{t('profile.save_and_continue')}</MenuItem>
              <MenuItem onClick={closeSaveMenu}>{t('profile.save_and_close')}</MenuItem>
            </Menu>
          </Box>
        </form>
        </Box>
      </CardBox>
    </Box>
  );
};

export default General;

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  Box,
  Typography,
  TextField,
  Button,
  Stack,
  IconButton,
  InputAdornment,
  Divider,
  alpha,
  styled,
} from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import { useTranslation } from 'react-i18next';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const createChangePasswordSchema = (t: (key: string) => string) =>
  z
    .object({
      currentPassword: z
        .string()
        .min(1, t('profile.current_password_required')),
      newPassword: z.string().min(1, t('profile.new_password_required')),
      confirmPassword: z
        .string()
        .min(1, t('profile.confirm_password_required')),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
      message: t('profile.passwords_do_not_match'),
      path: ['confirmPassword'],
    });

type ChangePasswordFormValues = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

const defaultValues: ChangePasswordFormValues = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
};

const CardBox = styled(Box)(({ theme }) => ({
  backgroundColor: theme.palette.semantic.surface.card,
  border: `1px solid ${theme.palette.semantic.border.card}`,
}));

const StyledTextField = styled(TextField)(({ theme }) => ({
  '& .MuiOutlinedInput-root': {
    backgroundColor: theme.palette.semantic.surface.input,
    '&.Mui-disabled': {
      backgroundColor: alpha(theme.palette.action.disabledBackground, 0.5),
    },
  },
}));

const ChangePassword = () => {
  const { t } = useTranslation('common');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const changePasswordSchema = createChangePasswordSchema(t);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues,
  });

  const onSave = handleSubmit((data) => {
    console.log('Change password', data);
  });

  return (
    <Box
      className="flex-1 min-w-0 p-6 flex justify-center items-start"
      sx={(theme) => ({ backgroundColor: theme.palette.background.default })}
    >
      <CardBox className="w-full rounded-xl p-6 shadow-md">
        <Box className="flex items-center gap-3 mb-4">
          <LockIcon sx={{ color: 'primary.main', fontSize: 28 }} />
          <Typography
            className="font-semibold text-xl"
            sx={(theme) => ({ color: theme.palette.primary.main })}
            variant="h6"
          >
            {t('profile.change_password')}
          </Typography>
        </Box>

        <Divider className="mx-0" />

        <Box component="form" onSubmit={onSave} className="mt-6">
          <Stack spacing={2.5}>
            <StyledTextField
              label={`${t('profile.current_password')} *`}
              type={showCurrentPassword ? 'text' : 'password'}
              fullWidth
              error={!!errors.currentPassword}
              helperText={errors.currentPassword?.message}
              {...register('currentPassword')}
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label={
                          showCurrentPassword
                            ? t('profile.hide_password')
                            : t('profile.show_password')
                        }
                        onClick={() => setShowCurrentPassword((prev) => !prev)}
                        edge="end"
                        size="small"
                      >
                        {showCurrentPassword ? (
                          <VisibilityOff />
                        ) : (
                          <Visibility />
                        )}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />
            <StyledTextField
              label={`${t('profile.new_password')} *`}
              type={showNewPassword ? 'text' : 'password'}
              fullWidth
              error={!!errors.newPassword}
              helperText={errors.newPassword?.message}
              {...register('newPassword')}
              slotProps={{
                input: {
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label={
                        showNewPassword
                          ? t('profile.hide_password')
                          : t('profile.show_password')
                      }
                      onClick={() => setShowNewPassword((prev) => !prev)}
                      edge="end"
                      size="small"
                    >
                      {showNewPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                )},
              }}
            />
            <StyledTextField
              label={`${t('profile.confirm_password')} *`}
              type={showConfirmPassword ? 'text' : 'password'}
              fullWidth
              error={!!errors.confirmPassword}
              helperText={errors.confirmPassword?.message}
              {...register('confirmPassword')}
              slotProps={{
                input: {
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label={
                        showConfirmPassword
                          ? t('profile.hide_password')
                          : t('profile.show_password')
                      }
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                      edge="end"
                      size="small"
                    >
                      {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                )},
              }}
            />
          </Stack>

          <Box className="flex items-center gap-3 mt-6 flex-wrap justify-end">
            <Button variant="outlined" color="primary" type="button">
              {t('profile.cancel')}
            </Button>
            <Button variant="contained" type="submit">
              {t('profile.save')}
            </Button>
          </Box>
        </Box>
      </CardBox>
    </Box>
  );
};

export default ChangePassword;

import { useState, forwardRef } from 'react';
import { useForm } from 'react-hook-form';
import { Link as RouterLink, type LinkProps as RouterLinkProps } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Box,
  TextField,
  Button,
  IconButton,
  InputAdornment,
  Typography,
  Stack,
  Alert
} from '@mui/material';
import { 
  Language, 
  LightMode, 
  DarkMode,
  Email as EmailIcon,
  ArrowBack
} from '@mui/icons-material';
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod"
import { useSwitchTheme } from '@item-bank/ui';
import { styled, alpha } from '@mui/material/styles';

const forgotPasswordSchema = z.object({
  email: z.email()
});

const LinkBehavior = forwardRef<HTMLAnchorElement, RouterLinkProps>(function LinkBehavior(props, ref) {
  return <RouterLink ref={ref} {...props} />;
});

const PageRoot = styled(Box)(({ theme }) => ({
  background: theme.palette.semantic.auth.pageBackground,
}));

const UtilityButton = styled(IconButton)(({ theme }) => ({
  backgroundColor: theme.palette.semantic.auth.utilityButtonBg,
  backdropFilter: 'blur(10px)',
  border: `1px solid ${theme.palette.semantic.border.field}`,
  '&:hover': {
    backgroundColor: alpha(theme.palette.background.paper, theme.palette.mode === 'dark' ? 0.2 : 0.4),
  },
}));

const AuthCard = styled(Box)(({ theme }) => ({
  backgroundColor: theme.palette.semantic.auth.cardBackground,
  border: `1px solid ${theme.palette.semantic.border.field}`,
  boxShadow: theme.palette.semantic.auth.cardBoxShadow,
}));

const StyledTextField = styled(TextField)(({ theme }) => ({
  '& .MuiOutlinedInput-root': {
    backgroundColor: theme.palette.semantic.auth.fieldBackground,
    borderRadius: theme.spacing(2),
    '& fieldset': {
      borderColor: theme.palette.semantic.border.field,
    },
    '&:hover fieldset': {
      borderColor: alpha(theme.palette.divider, theme.palette.mode === 'dark' ? 0.5 : 0.4),
    },
    '&.Mui-focused fieldset': {
      borderColor: theme.palette.primary.main,
      borderWidth: 1,
    },
  },
}));

const PrimaryButton = styled(Button)(({ theme }) => ({
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.primary.contrastText,
  boxShadow: `0 4px 14px 0 ${alpha(theme.palette.primary.main, 0.39)}`,
  '&:hover': {
    backgroundColor: theme.palette.primary.dark,
    boxShadow: `0 6px 20px 0 ${alpha(theme.palette.primary.main, 0.5)}`,
  },
}));

const BackButton = styled(Button)<{ component?: React.ElementType } & RouterLinkProps>(({ theme }) => ({
  color: theme.palette.text.secondary,
  '&:hover': {
    color: theme.palette.text.primary,
    backgroundColor: 'transparent',
  },
}));

const ForgotPassword = () => {
  const [submitted, setSubmitted] = useState(false);
  const {register, handleSubmit, formState: {errors}} = useForm({resolver: zodResolver(forgotPasswordSchema)});
  const { t, i18n } = useTranslation('auth');
  const { switchTheme, mode } = useSwitchTheme();

  const resetPassword = handleSubmit(async (data) => {
    console.log(data)
    setSubmitted(true);
  })

  const switchLanguage = () => {
    const currentLang = i18n.language;
    i18n.changeLanguage(currentLang === 'en' ? 'ar' : 'en')
    localStorage.setItem("lang", currentLang === 'en' ? 'ar' : 'en')
  }

  return (
    <PageRoot className='min-h-screen flex items-center justify-center relative'>
      <Box className='absolute top-5 right-5 flex gap-2'>
        <UtilityButton onClick={switchLanguage}>
          <Language />
        </UtilityButton>
        <UtilityButton onClick={switchTheme}>
          {mode === 'dark' ? <LightMode /> : <DarkMode />}
        </UtilityButton>
      </Box>

      <Box className='w-full max-w-[480px] mx-4' component="form" onSubmit={resetPassword}>
        <AuthCard className='backdrop-blur-[20px] rounded-[24px] p-10'>
          <Stack spacing={3} alignItems="center">
            <img
              className='h-20 object-contain'
              src="/images/york-press.png"
              alt="York Press logo"
            />

            <Typography className='font-bold' sx={(theme) => ({ color: theme.palette.text.primary })} variant="h4" component="h1">
              {t("forgot_password_title")}
            </Typography>

            <Typography sx={(theme) => ({ color: theme.palette.text.secondary })} className='text-center px-4' variant="body2">
              {t("forgot_password_description")}
            </Typography>

            <Stack spacing={2} width="100%">
              {submitted && (
                <Alert severity="success" className="w-full">
                  {t("reset_link_sent")}
                </Alert>
              )}

              <StyledTextField
                fullWidth
                type="email"
                placeholder={t("Email")}
                error={!!errors.email}
                helperText={errors.email ? t("invalid_email") : null}
                {...register("email", {required: true})}
                slotProps={{
                  input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <EmailIcon sx={{ color: 'text.secondary' }} />
                    </InputAdornment>
                  )},
                }}
              />

              <PrimaryButton
                className='rounded-2xl py-3 text-base font-semibold normal-case'
                data-testid='reset-btn'
                type='submit'
                fullWidth
                variant="contained"
              >
                {t("send_reset_link")}
              </PrimaryButton>

              <Box className="mt-4 flex justify-center items-center w-full">
                <BackButton
                  className="no-underline normal-case text-sm"
                  component={LinkBehavior}
                  to="/login"
                  startIcon={<ArrowBack />}
                >
                  {t("back_to_login")}
                </BackButton>
              </Box>
            </Stack>
          </Stack>
        </AuthCard>
      </Box>
    </PageRoot>
  );
};

export default ForgotPassword;

import { useState, forwardRef } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, Link as RouterLink, type LinkProps as RouterLinkProps } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Box,
  TextField,
  Button,
  IconButton,
  InputAdornment,
  Typography,
  Stack
} from '@mui/material';
import { 
  Visibility, 
  VisibilityOff, 
  Language, 
  LightMode, 
  DarkMode,
  Email as EmailIcon,
  Lock as LockIcon,
  Person as PersonIcon
} from '@mui/icons-material';
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod"
import { useSwitchTheme } from '@item-bank/ui';
import { styled, alpha } from '@mui/material/styles';

const createSignUpSchema = (t: (key: string) => string) => z.object({
  fullName: z.string().min(2),
  email: z.email(),
  password: z.string().min(8),
  confirmPassword: z.string().min(1)
}).refine((data) => data.password === data.confirmPassword, {
  message: t('auth:passwords_not_match'),
  path: ["confirmPassword"],
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

const InlineLink = styled(Box)<{ component?: React.ElementType } & RouterLinkProps>(({ theme }) => ({
  color: theme.palette.text.primary,
  '&:hover': {
    textDecoration: 'underline',
  },
}));

const SignUp = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { t, i18n } = useTranslation(['auth', 'common']);
  const signUpSchema = createSignUpSchema(t);
  const {register, handleSubmit, formState: {errors}} = useForm({resolver: zodResolver(signUpSchema)});
  const { switchTheme, mode } = useSwitchTheme();
  const navigate = useNavigate();

  const signUp = handleSubmit(async (data) => {
    console.log(data)
    localStorage.setItem("token", "test");
    navigate("/home", {replace: true})
  })

  const switchLanguage = () => {
    const currentLang = i18n.language;
    i18n.changeLanguage(currentLang === 'en' ? 'ar' : 'en')
    localStorage.setItem("lang", currentLang === 'en' ? 'ar' : 'en')
  }

  return (
    <PageRoot className="min-h-screen flex items-center justify-center relative">
      <Box className="absolute top-5 right-5 flex gap-2">
        <UtilityButton onClick={switchLanguage}>
          <Language />
        </UtilityButton>
        <UtilityButton onClick={switchTheme}>
          {mode === 'dark' ? <LightMode /> : <DarkMode />}
        </UtilityButton>
      </Box>

      <Box className="w-full max-w-[480px] mx-4" component="form" onSubmit={signUp}>
        <AuthCard className="backdrop-blur-[20px] rounded-[24px] p-10">
          <Stack spacing={3} alignItems="center">
            <img
              className="h-20 object-contain"
              src="/images/york-press.png"
              alt="York Press logo"
            />

            <Typography className="font-bold" sx={(theme) => ({ color: theme.palette.text.primary })} variant="h4" component="h1">
              {t("common:AuthorApp")}
            </Typography>

            <Stack spacing={2} width="100%">
              <StyledTextField
                fullWidth
                type="text"
                placeholder={t("auth:full_name")}
                error={!!errors.fullName}
                helperText={errors.fullName ? t("auth:full_name_required") : null}
                {...register("fullName", {required: true})}
                slotProps={{
                  input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <PersonIcon sx={{ color: 'text.secondary' }} />
                    </InputAdornment>
                  )},
                }}
              />

              <StyledTextField
                fullWidth
                type="email"
                placeholder={t("auth:Email")}
                error={!!errors.email}
                helperText={errors.email ? t("auth:invalid_email") : null}
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

              <StyledTextField
                fullWidth
                type={showPassword ? 'text' : 'password'}
                placeholder={t("auth:Password")}
                error={!!errors.password}
                helperText={errors.password ? t("auth:password_min_length") : null}
                {...register("password", {required: true})}
                slotProps={{
                  input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockIcon sx={{ color: 'text.secondary' }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label={
                          showPassword
                            ? t('auth:hide_password')
                            : t('auth:show_password')
                        }
                        onClick={() => setShowPassword(!showPassword)}
                        onMouseDown={(e) => e.preventDefault()}
                        onMouseUp={(e) => e.preventDefault()}
                        edge="end"
                        size="small"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  )},
                }}
              />

              <StyledTextField
                fullWidth
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder={t("auth:confirm_password")}
                error={!!errors.confirmPassword}
                helperText={errors.confirmPassword ? t("auth:passwords_not_match") : null}
                {...register("confirmPassword", {required: true})}
                slotProps={{
                  input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockIcon sx={{ color: 'text.secondary' }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label={
                          showConfirmPassword
                            ? t('auth:hide_password')
                            : t('auth:show_password')
                        }
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        onMouseDown={(e) => e.preventDefault()}
                        onMouseUp={(e) => e.preventDefault()}
                        edge="end"
                        size="small"
                      >
                        {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  )},
                }}
              />

              <PrimaryButton
                className="rounded-2xl py-3 text-base font-semibold normal-case"
                data-testid='signup-btn'
                type='submit'
                fullWidth
                variant="contained"
              >
                {t("auth:create_account")}
              </PrimaryButton>

              <Box className="mt-4 flex justify-center items-center w-full">
                <Box className='font-sm' sx={(theme) => ({ color: theme.palette.text.secondary })}>
                  {t("auth:already_have_account")}{' '}
                  <InlineLink
                    className="font-semibold no-underline"
                    component={LinkBehavior}
                    to="/login"
                  >
                    {t("auth:Login")}
                  </InlineLink>
                </Box>
              </Box>
            </Stack>
          </Stack>
        </AuthCard>
      </Box>
    </PageRoot>
  );
};

export default SignUp;

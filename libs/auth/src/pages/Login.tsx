import { useState } from 'react';

import { useForm } from 'react-hook-form';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Eye, EyeOff, Mail, Lock } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';

import { login } from '@item-bank/api';
import { ALL_AUTHORING_ROLES, LEARNER_ROLE, PLATFORM_ROLES } from '@item-bank/types';

import { useAuth } from '../hooks/useAuth';
import AuthPageWrapper from '../components/AuthPageWrapper';
import AuthCard from '../components/AuthCard';
import AuthField from '../components/AuthField';

const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

type LoginFields = z.infer<typeof loginSchema>;

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<LoginFields>({
    resolver: zodResolver(loginSchema),
  });
  const { t } = useTranslation(['auth', 'common']);
  const navigate = useNavigate();
  const { setSession } = useAuth();

  const { mutate, isPending, error } = useMutation({
    mutationFn: ({ email, password }: LoginFields) => login(email, password),
    onSuccess: (data) => {
      const roles = data.user.roles ?? [];

      // 1. Store the verified session — must happen before navigate().
      setSession(
        {
          id: data.user.id,
          email: data.user.email,
          role: data.user.role,
          roles,
          tenant_id: data.user.tenant_id,
          is_active: data.user.is_active,
        },
        data.csrf_token,
      );

      // 2. Navigate based on the roles value from the API response.
      //    Reading from useAuth() here would give stale pre-login state.
      const isPlatform = roles.some((r) =>
        (PLATFORM_ROLES as readonly string[]).includes(r),
      );
      const isLearner = roles.includes(LEARNER_ROLE);
      const isAuthor = roles.some((r) =>
        (ALL_AUTHORING_ROLES as readonly string[]).includes(r),
      );

      if (isPlatform) {
        navigate('/platform/dashboard', { replace: true });
      } else if (isAuthor && isLearner) {
        const lastMode = localStorage.getItem('last-mode');
        if (lastMode === 'learn') navigate('/learn/dashboard', { replace: true });
        else if (lastMode === 'author') navigate('/dashboard', { replace: true });
        else navigate('/role-select', { replace: true });
      } else if (isLearner) {
        navigate('/learn/dashboard', { replace: true });
      } else {
        // Default: authoring roles or legacy single-role accounts.
        navigate('/dashboard', { replace: true });
      }
    },
  });

  const onSubmit = handleSubmit((data) => mutate(data));

  return (
    <AuthPageWrapper>
      <AuthCard>
        <form onSubmit={onSubmit} className="flex flex-col items-center gap-6 w-full">

          {/* Logo */}
          <img
            className="h-20 object-contain"
            src="/york-e-logo.png"
            alt="eYork E-Learning"
          />

          {/* Title */}
          <h1 className="text-[1.75rem] font-bold text-foreground">
            {t('common:AuthorApp')}
          </h1>

          {/* Fields + submit */}
          <div className="w-full flex flex-col gap-3">

            <AuthField
              type="email"
              placeholder={t('auth:Email')}
              icon={<Mail size={16} />}
              error={errors.email ? t('auth:invalid_email') : null}
              registration={register('email', { required: true })}
            />

            <AuthField
              type={showPassword ? 'text' : 'password'}
              placeholder={t('auth:Password')}
              icon={<Lock size={16} />}
              error={errors.password ? t('auth:password_required') : null}
              registration={register('password', { required: true })}
              endAdornment={
                <button
                  type="button"
                  aria-label={showPassword ? t('auth:hide_password') : t('auth:show_password')}
                  onClick={() => setShowPassword(!showPassword)}
                  onMouseDown={(e) => e.preventDefault()}
                  className="text-muted-foreground hover:text-foreground transition-colors p-0.5"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              }
            />

            {/* Primary submit button */}
            <button
              type="submit"
              data-testid="login-btn"
              disabled={isPending}
              className="w-full rounded-2xl py-3 text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-[0_4px_14px_0_hsl(var(--primary)/0.35)] hover:shadow-[0_6px_20px_0_hsl(var(--primary)/0.45)] mt-1 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isPending ? t('auth:logging_in') : t('auth:Login')}
            </button>

            {/* API error — shown below the button when the mutation rejects */}
            {error !== null && (
              <p className="text-sm text-destructive text-center">
                {error.message}
              </p>
            )}
          </div>

          {/* Footer links */}
          <div className="flex items-center justify-between w-full">
            <RouterLink
              to="/forgot-password"
              className="text-sm text-muted-foreground hover:text-foreground hover:underline whitespace-nowrap no-underline transition-colors"
            >
              {t('auth:forgot_password')}
            </RouterLink>
            <span className="text-sm text-muted-foreground">
              {t('auth:no_account')}{' '}
              <RouterLink
                to="/signup"
                className="text-primary font-medium hover:underline no-underline transition-colors"
              >
                {t('auth:sign_up')}
              </RouterLink>
            </span>
          </div>

        </form>
      </AuthCard>
    </AuthPageWrapper>
  );
};

export default Login;

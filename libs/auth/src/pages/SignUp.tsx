import { useState } from 'react';

import { useForm } from 'react-hook-form';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Eye, EyeOff, Mail, Lock, User } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';

import { register } from '@item-bank/api';

import AuthPageWrapper from '../components/AuthPageWrapper';
import AuthCard from '../components/AuthCard';
import AuthField from '../components/AuthField';

const signUpBaseSchema = z.object({
  fullName: z.string().min(2),
  email: z.email(),
  password: z.string().min(8),
  confirmPassword: z.string().min(1),
});

type SignUpFields = z.infer<typeof signUpBaseSchema>;

const SignUp = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { t } = useTranslation(['auth', 'common']);
  const signUpSchema = signUpBaseSchema.refine(
    (data) => data.password === data.confirmPassword,
    {
      message: t('auth:passwords_not_match'),
      path: ['confirmPassword'],
    },
  );
  const { register: registerField, handleSubmit, formState: { errors } } = useForm<SignUpFields>({
    resolver: zodResolver(signUpSchema),
  });
  const navigate = useNavigate();

  const { mutate, isPending, error } = useMutation({
    mutationFn: ({ fullName, email, password }: SignUpFields) =>
      register(fullName, email, password),
    onSuccess: () => {
      navigate('/login', { replace: true });
    },
  });

  const onSubmit = handleSubmit((data) => mutate(data));

  return (
    <AuthPageWrapper>
      <AuthCard>
        <form onSubmit={onSubmit} className="flex flex-col items-center gap-6 w-full">

          <img
            className="h-20 object-contain"
            src="/york-e-logo.png"
            alt="eYork E-Learning"
          />

          <h1 className="text-[1.75rem] font-bold text-foreground">
            {t('common:AuthorApp')}
          </h1>

          <div className="w-full flex flex-col gap-3">

            <AuthField
              type="text"
              placeholder={t('auth:full_name')}
              icon={<User size={16} />}
              error={errors.fullName ? t('auth:full_name_required') : null}
              registration={registerField('fullName', { required: true })}
            />

            <AuthField
              type="email"
              placeholder={t('auth:Email')}
              icon={<Mail size={16} />}
              error={errors.email ? t('auth:invalid_email') : null}
              registration={registerField('email', { required: true })}
            />

            <AuthField
              type={showPassword ? 'text' : 'password'}
              placeholder={t('auth:Password')}
              icon={<Lock size={16} />}
              error={errors.password ? t('auth:password_min_length') : null}
              registration={registerField('password', { required: true })}
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

            <AuthField
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder={t('auth:confirm_password')}
              icon={<Lock size={16} />}
              error={errors.confirmPassword ? t('auth:passwords_not_match') : null}
              registration={registerField('confirmPassword', { required: true })}
              endAdornment={
                <button
                  type="button"
                  aria-label={showConfirmPassword ? t('auth:hide_password') : t('auth:show_password')}
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  onMouseDown={(e) => e.preventDefault()}
                  className="text-muted-foreground hover:text-foreground transition-colors p-0.5"
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              }
            />

            <button
              type="submit"
              data-testid="signup-btn"
              disabled={isPending}
              className="w-full rounded-2xl py-3 text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-[0_4px_14px_0_hsl(var(--primary)/0.35)] hover:shadow-[0_6px_20px_0_hsl(var(--primary)/0.45)] mt-1 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isPending ? t('auth:creating_account') : t('auth:create_account')}
            </button>

            {error !== null && (
              <p className="text-sm text-destructive text-center">
                {error.message}
              </p>
            )}
          </div>

          <p className="text-sm text-muted-foreground">
            {t('auth:already_have_account')}{' '}
            <RouterLink
              to="/login"
              className="font-semibold text-foreground hover:underline no-underline transition-colors"
            >
              {t('auth:Login')}
            </RouterLink>
          </p>

        </form>
      </AuthCard>
    </AuthPageWrapper>
  );
};

export default SignUp;

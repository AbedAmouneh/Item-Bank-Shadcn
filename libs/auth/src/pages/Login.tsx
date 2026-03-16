import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod"
import { Eye, EyeOff, Mail, Lock } from 'lucide-react';
import AuthPageWrapper from '../components/AuthPageWrapper';
import AuthCard from '../components/AuthCard';
import AuthField from '../components/AuthField';

const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1)
});

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const {register, handleSubmit, formState: {errors}} = useForm({resolver: zodResolver(loginSchema)});
  const { t } = useTranslation(['auth', 'common']);
  const navigate = useNavigate();

  const login = handleSubmit(async (data) => {
    console.log(data)
    localStorage.setItem("token", "test");
    navigate("/home", {replace: true})
  })

  return (
    <AuthPageWrapper>
      <AuthCard>
        <form onSubmit={login} className="flex flex-col items-center gap-6 w-full">

          {/* Logo */}
          <img
            className="h-20 object-contain"
            src="/images/york-press.png"
            alt="York Press logo"
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
              className="w-full rounded-2xl py-3 text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-[0_4px_14px_0_hsl(var(--primary)/0.35)] hover:shadow-[0_6px_20px_0_hsl(var(--primary)/0.45)] mt-1"
            >
              {t('auth:Login')}
            </button>
          </div>

          {/* Footer links */}
          <div className="flex justify-between items-center w-full rtl:flex-row-reverse">
            <RouterLink
              to="/forgot-password"
              className="text-sm text-muted-foreground hover:text-foreground hover:underline whitespace-nowrap no-underline transition-colors"
            >
              {t('auth:forgot_password')}
            </RouterLink>
            <span className="text-sm text-muted-foreground whitespace-nowrap">
              {t('auth:no_account')}{' '}
              <RouterLink
                to="/signup"
                className="font-semibold text-foreground hover:underline no-underline transition-colors"
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

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link as RouterLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod"
import { Mail, ArrowLeft } from 'lucide-react';
import AuthPageWrapper from '../components/AuthPageWrapper';
import AuthCard from '../components/AuthCard';
import AuthField from '../components/AuthField';

const forgotPasswordSchema = z.object({
  email: z.email()
});

const ForgotPassword = () => {
  const [submitted, setSubmitted] = useState(false);
  const {register, handleSubmit, formState: {errors}} = useForm({resolver: zodResolver(forgotPasswordSchema)});
  const { t } = useTranslation('auth');

  const resetPassword = handleSubmit(async (data) => {
    console.log(data)
    setSubmitted(true);
  })

  return (
    <AuthPageWrapper>
      <AuthCard>
        <form onSubmit={resetPassword} className="flex flex-col items-center gap-6 w-full">

          <img
            className="h-20 object-contain"
            src="/images/york-press.png"
            alt="York Press logo"
          />

          <h1 className="text-[1.75rem] font-bold text-foreground text-center">
            {t('forgot_password_title')}
          </h1>

          <p className="text-sm text-muted-foreground text-center px-4 leading-relaxed">
            {t('forgot_password_description')}
          </p>

          <div className="w-full flex flex-col gap-3">

            {/* Success alert — shown after submit */}
            {submitted && (
              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 text-sm">
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                {t('reset_link_sent')}
              </div>
            )}

            <AuthField
              type="email"
              placeholder={t('Email')}
              icon={<Mail size={16} />}
              error={errors.email ? t('invalid_email') : null}
              registration={register('email', { required: true })}
            />

            <button
              type="submit"
              data-testid="reset-btn"
              className="w-full rounded-2xl py-3 text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-[0_4px_14px_0_hsl(var(--primary)/0.35)] mt-1"
            >
              {t('send_reset_link')}
            </button>
          </div>

          {/* Back to login link */}
          <RouterLink
            to="/login"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground no-underline transition-colors group"
          >
            <ArrowLeft size={14} className="transition-transform group-hover:-translate-x-0.5 rtl:rotate-180" />
            {t('back_to_login')}
          </RouterLink>

        </form>
      </AuthCard>
    </AuthPageWrapper>
  );
};

export default ForgotPassword;

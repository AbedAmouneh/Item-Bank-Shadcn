import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Lock, Eye, EyeOff } from 'lucide-react';
import { Button, Input, Label, Separator } from '@item-bank/ui';

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

  const onSave = handleSubmit((_data) => {
    // Password change handled via API mutation
  });

  return (
    <div className="flex-1 min-w-0 p-6 flex justify-center items-start bg-background">
      <div className="w-full rounded-xl p-6 shadow-md border border-border bg-card">
        <div className="flex items-center gap-3 mb-4">
          <Lock className="text-primary" size={28} />
          <h2 className="font-semibold text-xl text-primary">
            {t('profile.change_password')}
          </h2>
        </div>

        <Separator className="mx-0" />

        <form onSubmit={onSave} className="mt-6 flex flex-col gap-5">
          {/* Current password */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="currentPassword">
              {`${t('profile.current_password')} *`}
            </Label>
            <div className="relative">
              <Input
                id="currentPassword"
                type={showCurrentPassword ? 'text' : 'password'}
                className="bg-input pe-10"
                aria-invalid={!!errors.currentPassword}
                {...register('currentPassword')}
              />
              <button
                type="button"
                aria-label={
                  showCurrentPassword
                    ? t('profile.hide_password')
                    : t('profile.show_password')
                }
                onClick={() => setShowCurrentPassword((prev) => !prev)}
                onMouseDown={(e) => e.preventDefault()}
                className="absolute inset-y-0 end-0 flex items-center pe-3 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.currentPassword && (
              <p className="text-sm text-destructive">
                {errors.currentPassword.message}
              </p>
            )}
          </div>

          {/* New password */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="newPassword">
              {`${t('profile.new_password')} *`}
            </Label>
            <div className="relative">
              <Input
                id="newPassword"
                type={showNewPassword ? 'text' : 'password'}
                className="bg-input pe-10"
                aria-invalid={!!errors.newPassword}
                {...register('newPassword')}
              />
              <button
                type="button"
                aria-label={
                  showNewPassword
                    ? t('profile.hide_password')
                    : t('profile.show_password')
                }
                onClick={() => setShowNewPassword((prev) => !prev)}
                onMouseDown={(e) => e.preventDefault()}
                className="absolute inset-y-0 end-0 flex items-center pe-3 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.newPassword && (
              <p className="text-sm text-destructive">
                {errors.newPassword.message}
              </p>
            )}
          </div>

          {/* Confirm password */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="confirmPassword">
              {`${t('profile.confirm_password')} *`}
            </Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                className="bg-input pe-10"
                aria-invalid={!!errors.confirmPassword}
                {...register('confirmPassword')}
              />
              <button
                type="button"
                aria-label={
                  showConfirmPassword
                    ? t('profile.hide_password')
                    : t('profile.show_password')
                }
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                onMouseDown={(e) => e.preventDefault()}
                className="absolute inset-y-0 end-0 flex items-center pe-3 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="text-sm text-destructive">
                {errors.confirmPassword.message}
              </p>
            )}
          </div>

          <div className="flex items-center gap-3 flex-wrap justify-end">
            <Button type="button" variant="outline">
              {t('profile.cancel')}
            </Button>
            <Button type="submit">{t('profile.save')}</Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChangePassword;

import { useState, useEffect, useCallback } from 'react';

import { useTranslation } from 'react-i18next';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as z from 'zod';

import {
  Badge,
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@item-bank/ui';
import { updateUser } from '@item-bank/api';
import type { AdminUser } from '@item-bank/api';

import { AccessControlTab } from './AccessControlTab';

// ── Profile tab schema ─────────────────────────────────────────────────────────

const profileSchema = z.object({
  email: z.string().email(),
  role: z.enum(['admin', 'user', 'learner']),
});

type ProfileFormValues = {
  email: string;
  role: 'admin' | 'user' | 'learner';
};

// ── Profile tab ────────────────────────────────────────────────────────────────

interface ProfileTabProps {
  user: AdminUser;
  onSuccess: () => void;
}

function ProfileTab({ user, onSuccess }: ProfileTabProps) {
  const { t } = useTranslation('common');
  const [apiError, setApiError] = useState('');

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { email: user.email, role: user.role },
  });

  // Keep form in sync if the parent swaps to a different user.
  useEffect(() => {
    reset({ email: user.email, role: user.role });
  }, [user, reset]);

  const { mutate: save, isPending } = useMutation({
    mutationFn: (data: ProfileFormValues) => updateUser(user.id, data),
    onSuccess: () => {
      setApiError('');
      onSuccess();
    },
    onError: (err) =>
      setApiError(err instanceof Error ? err.message : t('admin.users.edit_error')),
  });

  const onSubmit = handleSubmit((data) => {
    setApiError('');
    save(data);
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5 p-1">
      {/* Status (read-only) */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{t('admin.users.status')}</span>
        <Badge
          variant={user.is_active ? 'default' : 'secondary'}
          className={
            user.is_active
              ? 'bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30'
              : 'bg-muted text-muted-foreground border-border'
          }
        >
          {user.is_active ? t('admin.users.active') : t('admin.users.inactive')}
        </Badge>
      </div>

      <Separator />

      {/* Email */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="us-email">{t('admin.users.email')}</Label>
        <Input
          id="us-email"
          type="email"
          className="bg-input"
          aria-invalid={!!errors.email}
          {...register('email')}
        />
        {errors.email && (
          <p className="text-sm text-destructive">{errors.email.message}</p>
        )}
      </div>

      {/* Role */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="us-role">{t('admin.users.role')}</Label>
        <Controller
          name="role"
          control={control}
          render={({ field }) => (
            <Select onValueChange={field.onChange} value={field.value}>
              <SelectTrigger id="us-role" aria-invalid={!!errors.role}>
                <SelectValue placeholder={t('admin.users.select_role')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">{t('admin.users.role_user')}</SelectItem>
                <SelectItem value="admin">{t('admin.users.role_admin')}</SelectItem>
                <SelectItem value="learner">{t('admin.users.role_learner')}</SelectItem>
              </SelectContent>
            </Select>
          )}
        />
        {errors.role && (
          <p className="text-sm text-destructive">{errors.role.message}</p>
        )}
      </div>

      {apiError && <p className="text-sm text-destructive">{apiError}</p>}

      <div className="flex justify-end gap-3 pt-1">
        <Button type="submit" disabled={isPending}>
          {isPending ? t('profile.saving') : t('admin.users.save_changes')}
        </Button>
      </div>
    </form>
  );
}

// ── UserSheet ──────────────────────────────────────────────────────────────────

interface UserSheetProps {
  open: boolean;
  onClose: () => void;
  user: AdminUser | null;
}

/**
 * Side-sheet for editing a user.
 *
 * Tab 1 (Profile): email + role form, read-only status badge.
 * Tab 2 (Access Control): access mode radio + assigned item banks management.
 */
export function UserSheet({ open, onClose, user }: UserSheetProps) {
  const { t } = useTranslation('common');
  const queryClient = useQueryClient();

  // Keep a local copy so the sheet stays populated while closing.
  const [localUser, setLocalUser] = useState<AdminUser | null>(user);
  useEffect(() => {
    if (user) setLocalUser(user);
  }, [user]);

  const handleProfileSuccess = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    onClose();
  }, [queryClient, onClose]);

  const handleModeChange = useCallback((updated: AdminUser) => {
    setLocalUser(updated);
  }, []);

  return (
    <Sheet open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <SheetContent className="flex w-full flex-col gap-0 sm:max-w-md" side="right">
        <SheetHeader className="pb-4">
          <SheetTitle>
            {localUser?.email ?? t('admin.users.edit_dialog_title')}
          </SheetTitle>
        </SheetHeader>

        {localUser && (
          <Tabs defaultValue="profile" className="flex flex-1 flex-col overflow-hidden">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="profile">
                {t('admin.users.tab_profile')}
              </TabsTrigger>
              <TabsTrigger value="access">
                {t('admin.users.tab_access_control')}
              </TabsTrigger>
            </TabsList>

            <div className="mt-4 flex-1 overflow-y-auto">
              <TabsContent value="profile" className="mt-0">
                <ProfileTab user={localUser} onSuccess={handleProfileSuccess} />
              </TabsContent>

              <TabsContent value="access" className="mt-0">
                <AccessControlTab user={localUser} onModeChange={handleModeChange} />
              </TabsContent>
            </div>
          </Tabs>
        )}
      </SheetContent>
    </Sheet>
  );
}

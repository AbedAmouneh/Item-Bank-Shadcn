import { useState, useCallback, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as z from 'zod';
import { UserCog, Plus, Eye, EyeOff } from 'lucide-react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Badge,
  Separator,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@item-bank/ui';
import { getUsers, createUser, activateUser, deactivateUser, updateUser } from '@item-bank/api';
import type { CreateUserData, UpdateUserData, AdminUser } from '@item-bank/api';
import { useAuth } from '@item-bank/auth';

// ---------------------------------------------------------------------------
// Create User Dialog
// ---------------------------------------------------------------------------

const createUserSchema = (t: (k: string) => string) =>
  z.object({
    email: z
      .string()
      .min(1, t('admin.users.email_required'))
      .email(t('admin.users.email_invalid')),
    password: z
      .string()
      .min(1, t('admin.users.password_required'))
      .min(8, t('admin.users.password_min')),
    role: z.enum(['admin', 'user'], {
      error: t('admin.users.role_required'),
    }),
  });

type CreateUserFormValues = {
  email: string;
  password: string;
  role: 'admin' | 'user';
};

interface CreateUserDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

function CreateUserDialog({ open, onClose, onSuccess }: CreateUserDialogProps) {
  const { t } = useTranslation('common');
  const [showPassword, setShowPassword] = useState(false);
  const [apiError, setApiError] = useState('');

  const schema = createUserSchema(t);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<CreateUserFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '', role: 'user' },
  });

  const { mutate: submitCreate, isPending } = useMutation({
    mutationFn: (data: CreateUserData) => createUser(data),
    onSuccess: () => {
      reset();
      setApiError('');
      onSuccess();
    },
    onError: (err) => {
      setApiError(err instanceof Error ? err.message : t('admin.users.create_error'));
    },
  });

  const handleClose = () => {
    reset();
    setApiError('');
    onClose();
  };

  const onSubmit = handleSubmit((data) => {
    setApiError('');
    submitCreate(data);
  });

  return (
    <Dialog open={open} onOpenChange={(isOpen: boolean) => { if (!isOpen) handleClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t('admin.users.dialog_title')}</DialogTitle>
        </DialogHeader>

        <form onSubmit={onSubmit} className="flex flex-col gap-4 pt-2">
          {/* Email */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cu-email">{t('admin.users.email')}</Label>
            <Input
              id="cu-email"
              type="email"
              className="bg-input"
              aria-invalid={!!errors.email}
              {...register('email')}
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cu-password">{t('admin.users.password')}</Label>
            <div className="relative">
              <Input
                id="cu-password"
                type={showPassword ? 'text' : 'password'}
                className="bg-input pe-10"
                aria-invalid={!!errors.password}
                {...register('password')}
              />
              <button
                type="button"
                aria-label={showPassword ? t('profile.hide_password') : t('profile.show_password')}
                onClick={() => setShowPassword((p) => !p)}
                onMouseDown={(e) => e.preventDefault()}
                className="absolute inset-y-0 end-0 flex items-center pe-3 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password.message}</p>
            )}
          </div>

          {/* Role */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cu-role">{t('admin.users.role')}</Label>
            <Controller
              name="role"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger id="cu-role" aria-invalid={!!errors.role}>
                    <SelectValue placeholder={t('admin.users.select_role')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">{t('admin.users.role_user')}</SelectItem>
                    <SelectItem value="admin">{t('admin.users.role_admin')}</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            {errors.role && (
              <p className="text-sm text-destructive">{errors.role.message}</p>
            )}
          </div>

          {apiError && (
            <p className="text-sm text-destructive">{apiError}</p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={handleClose}>
              {t('profile.cancel')}
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? t('profile.saving') : t('admin.users.create_user')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Edit User Dialog
// ---------------------------------------------------------------------------

const editUserSchema = z.object({
  email: z.string().email(),
  role: z.enum(['admin', 'user']),
});

type EditUserFormValues = {
  email: string;
  role: 'admin' | 'user';
};

interface EditUserDialogProps {
  open: boolean;
  onClose: () => void;
  user: AdminUser | null;
  onSuccess: () => void;
}

function EditUserDialog({ open, onClose, user, onSuccess }: EditUserDialogProps) {
  const { t } = useTranslation('common');
  const [apiError, setApiError] = useState('');

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<EditUserFormValues>({
    resolver: zodResolver(editUserSchema),
    defaultValues: { email: '', role: 'user' },
  });

  // Re-populate form whenever the target user changes.
  useEffect(() => {
    if (user) {
      reset({ email: user.email, role: user.role });
    }
  }, [user, reset]);

  const { mutate: submitEdit, isPending } = useMutation({
    mutationFn: (data: UpdateUserData) => updateUser(user!.id, data),
    onSuccess: () => {
      setApiError('');
      onSuccess();
    },
    onError: (err) => {
      setApiError(err instanceof Error ? err.message : t('admin.users.edit_error'));
    },
  });

  const handleClose = () => {
    setApiError('');
    onClose();
  };

  const onSubmit = handleSubmit((data) => {
    setApiError('');
    submitEdit(data);
  });

  return (
    <Dialog open={open} onOpenChange={(isOpen: boolean) => { if (!isOpen) handleClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t('admin.users.edit_dialog_title')}</DialogTitle>
        </DialogHeader>

        <form onSubmit={onSubmit} className="flex flex-col gap-4 pt-2">
          {/* Email */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="eu-email">{t('admin.users.email')}</Label>
            <Input
              id="eu-email"
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
            <Label htmlFor="eu-role">{t('admin.users.role')}</Label>
            <Controller
              name="role"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger id="eu-role" aria-invalid={!!errors.role}>
                    <SelectValue placeholder={t('admin.users.select_role')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">{t('admin.users.role_user')}</SelectItem>
                    <SelectItem value="admin">{t('admin.users.role_admin')}</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            {errors.role && (
              <p className="text-sm text-destructive">{errors.role.message}</p>
            )}
          </div>

          {apiError && (
            <p className="text-sm text-destructive">{apiError}</p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={handleClose}>
              {t('profile.cancel')}
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? t('profile.saving') : t('admin.users.save_changes')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Status badge helper
// ---------------------------------------------------------------------------

function StatusBadge({ isActive }: { isActive: boolean }) {
  const { t } = useTranslation('common');
  return (
    <Badge
      variant={isActive ? 'default' : 'secondary'}
      className={
        isActive
          ? 'bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30'
          : 'bg-muted text-muted-foreground border-border'
      }
    >
      {isActive ? t('admin.users.active') : t('admin.users.inactive')}
    </Badge>
  );
}

// ---------------------------------------------------------------------------
// Users page
// ---------------------------------------------------------------------------

function formatLastLogin(lastLogin?: string | null, neverLabel = 'Never'): string {
  if (!lastLogin) return neverLabel;
  return new Date(lastLogin).toLocaleDateString();
}

export default function Users() {
  const { t } = useTranslation('common');
  const { user } = useAuth();

  // Redirect non-admins immediately — the route is accessible to any
  // authenticated user, so the role check lives inside the page itself.
  if (user?.role !== 'admin') {
    return <Navigate replace to="/home" />;
  }

  return <UsersContent />;
}

/** Rendered only when role === 'admin'. Isolated so hooks always run in valid order. */
function UsersContent() {
  const { t } = useTranslation('common');
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<AdminUser | null>(null);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [toggleError, setToggleError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const { data: usersPage, isLoading, isError } = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: () => getUsers(),
  });

  const users: AdminUser[] = usersPage?.items ?? [];

  const { mutate: toggleStatus } = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      isActive ? deactivateUser(id) : activateUser(id),
    onMutate: ({ id }) => {
      setPendingUserId(id);
      setToggleError('');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
    onError: (err) => {
      setToggleError(err instanceof Error ? err.message : t('admin.users.toggle_error'));
    },
    onSettled: () => setPendingUserId(null),
  });

  const handleEditSuccess = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    setEditTarget(null);
  }, [queryClient]);

  const handleToggle = useCallback(
    (user: AdminUser) => {
      toggleStatus({ id: user.id, isActive: user.is_active });
    },
    [toggleStatus]
  );

  const handleCreateSuccess = useCallback(() => {
    setDialogOpen(false);
    setSuccessMessage(t('admin.users.create_success'));
    queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
  }, [queryClient, t]);

  return (
    <div className="p-6 flex flex-col gap-6">
      {/* Page heading */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <UserCog className="text-primary" size={28} />
          <h1 className="font-semibold text-xl text-foreground">
            {t('admin.users.title')}
          </h1>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus size={16} className="me-1.5" />
          {t('admin.users.create_user')}
        </Button>
      </div>

      <Separator />

      {successMessage && (
        <p className="text-sm text-green-600 dark:text-green-400">{successMessage}</p>
      )}

      {toggleError && (
        <p className="text-sm text-destructive">{toggleError}</p>
      )}

      {/* Users table */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        {isLoading && (
          <p className="p-6 text-sm text-muted-foreground">{t('profile.loading')}</p>
        )}

        {isError && (
          <p className="p-6 text-sm text-destructive">{t('profile.load_error')}</p>
        )}

        {!isLoading && !isError && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('admin.users.email')}</TableHead>
                <TableHead>{t('admin.users.role')}</TableHead>
                <TableHead>{t('admin.users.status')}</TableHead>
                <TableHead>{t('admin.users.last_login')}</TableHead>
                <TableHead className="text-end">{t('admin.users.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.email}</TableCell>
                  <TableCell>
                    {u.role === 'admin'
                      ? t('admin.users.role_admin')
                      : t('admin.users.role_user')}
                  </TableCell>
                  <TableCell>
                    <StatusBadge isActive={u.is_active} />
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {formatLastLogin(u.last_login, t('admin.users.never'))}
                  </TableCell>
                  <TableCell className="text-end">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditTarget(u)}
                      >
                        {t('admin.users.edit')}
                      </Button>
                      <Button
                        size="sm"
                        variant={u.is_active ? 'outline' : 'default'}
                        disabled={pendingUserId === u.id}
                        onClick={() => handleToggle(u)}
                      >
                        {u.is_active
                          ? t('admin.users.deactivate')
                          : t('admin.users.activate')}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <CreateUserDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSuccess={handleCreateSuccess}
      />

      <EditUserDialog
        open={editTarget !== null}
        onClose={() => setEditTarget(null)}
        user={editTarget}
        onSuccess={handleEditSuccess}
      />
    </div>
  );
}

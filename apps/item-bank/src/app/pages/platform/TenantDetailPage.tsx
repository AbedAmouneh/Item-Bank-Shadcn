import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';
import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@item-bank/ui';
import type { UpdateTenantData, TenantStatus, TenantPlan } from '@item-bank/types';
import {
  useTenant,
  useTenantUsers,
  useTenantUsage,
  useUpdateTenant,
} from './hooks/usePlatform';
import { TenantStatusBadge } from './components/TenantStatusBadge';

// ─── Overview tab ─────────────────────────────────────────────────────────────

const updateSchema = z.object({
  name: z.string().min(1),
  status: z.enum(['active', 'trial', 'suspended'] as const),
  plan: z.enum(['starter', 'growth', 'enterprise'] as const),
});

type UpdateFormValues = z.infer<typeof updateSchema>;

function OverviewTab({ tenantId }: { tenantId: string }) {
  const { t } = useTranslation('common');
  const { data: tenant, isLoading, isError } = useTenant(tenantId);
  const { mutate, isPending } = useUpdateTenant(tenantId);

  const { register, handleSubmit, control, formState: { errors } } = useForm<UpdateFormValues>({
    resolver: zodResolver(updateSchema),
    values: tenant
      ? { name: tenant.name, status: tenant.status, plan: tenant.plan }
      : { name: '', status: 'active', plan: 'starter' },
  });

  const onSubmit = handleSubmit((values) => {
    const data: UpdateTenantData = {
      name: values.name,
      status: values.status as TenantStatus,
      plan: values.plan as TenantPlan,
    };
    mutate(data, {
      onSuccess: () => toast.success(t('platform.save_success')),
      onError: (err) =>
        toast.error(err instanceof Error ? err.message : t('platform.save_error')),
    });
  });

  if (isLoading) return <p className="text-sm text-muted-foreground p-4">{t('platform.loading')}</p>;
  if (isError || !tenant) return <p className="text-sm text-destructive p-4">{t('platform.load_error')}</p>;

  return (
    <div className="grid gap-6 md:grid-cols-2 pt-4">
      {/* Read-only info */}
      <Card>
        <CardHeader><CardTitle className="text-sm">{t('platform.tab_overview')}</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm">
          <div><span className="text-muted-foreground">{t('platform.detail_slug')}: </span>{tenant.slug}</div>
          <div><span className="text-muted-foreground">{t('platform.detail_seats')}: </span>{tenant.seats_purchased}</div>
          <div><span className="text-muted-foreground">{t('platform.detail_seats_used')}: </span>{tenant.seats_used}</div>
          <div><span className="text-muted-foreground">{t('platform.detail_created')}: </span>{new Date(tenant.created_at).toLocaleDateString()}</div>
          {tenant.admin_email && (
            <div><span className="text-muted-foreground">{t('platform.detail_admin')}: </span>{tenant.admin_email}</div>
          )}
        </CardContent>
      </Card>

      {/* Edit form */}
      <Card>
        <CardHeader><CardTitle className="text-sm">{t('platform.edit_title')}</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="td-name">{t('platform.detail_name')}</Label>
              <Input id="td-name" className="bg-input" aria-invalid={!!errors.name} {...register('name')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="td-status">{t('platform.detail_status')}</Label>
              <Controller
                name="status"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger id="td-status"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">{t('platform.status_active')}</SelectItem>
                      <SelectItem value="trial">{t('platform.status_trial')}</SelectItem>
                      <SelectItem value="suspended">{t('platform.status_suspended')}</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="td-plan">{t('platform.detail_plan')}</Label>
              <Controller
                name="plan"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger id="td-plan"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="starter">{t('platform.plan_starter')}</SelectItem>
                      <SelectItem value="growth">{t('platform.plan_growth')}</SelectItem>
                      <SelectItem value="enterprise">{t('platform.plan_enterprise')}</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={isPending} size="sm">
                {isPending ? t('platform.saving') : t('platform.save')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Users tab ─────────────────────────────────────────────────────────────────

function UsersTab({ tenantId }: { tenantId: string }) {
  const { t } = useTranslation('common');
  const { data: users, isLoading, isError } = useTenantUsers(tenantId);

  if (isLoading) return <p className="text-sm text-muted-foreground p-4">{t('platform.loading')}</p>;
  if (isError) return <p className="text-sm text-destructive p-4">{t('platform.load_error')}</p>;
  if (!users?.length) return <p className="text-sm text-muted-foreground p-4">{t('platform.users_empty')}</p>;

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden mt-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('platform.user_col_name')}</TableHead>
            <TableHead>{t('platform.user_col_email')}</TableHead>
            <TableHead>{t('platform.user_col_roles')}</TableHead>
            <TableHead>{t('platform.user_col_status')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((u) => (
            <TableRow key={u.id}>
              <TableCell className="font-medium">
                {[u.first_name, u.last_name].filter(Boolean).join(' ') || '\u2014'}
              </TableCell>
              <TableCell className="text-muted-foreground text-sm">{u.email}</TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {u.roles.map((r) => (
                    <Badge key={r} variant="secondary" className="text-xs">{r}</Badge>
                  ))}
                </div>
              </TableCell>
              <TableCell>
                <Badge
                  className={
                    u.is_active
                      ? 'bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30'
                      : 'bg-muted text-muted-foreground border-border'
                  }
                >
                  {u.is_active ? t('admin.users.active') : t('admin.users.inactive')}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ─── Usage tab ─────────────────────────────────────────────────────────────────

function UsageTab({ tenantId }: { tenantId: string }) {
  const { t } = useTranslation('common');
  const { data: usage, isLoading, isError } = useTenantUsage(tenantId);

  if (isLoading) return <p className="text-sm text-muted-foreground p-4">{t('platform.loading')}</p>;
  if (isError || !usage) return <p className="text-sm text-destructive p-4">{t('platform.load_error')}</p>;

  const stats = [
    { label: t('platform.usage_courses'), value: usage.courses_created },
    { label: t('platform.usage_questions'), value: usage.questions_created },
    { label: t('platform.usage_learners'), value: usage.active_learners },
    { label: t('platform.usage_exams'), value: usage.exams_taken },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4 pt-4">
      {stats.map(({ label, value }) => (
        <Card key={label}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

/**
 * Tenant detail page with three tabs: Overview, Users, Usage.
 * Route: /platform/tenants/:id
 */
export default function TenantDetailPage() {
  const { t } = useTranslation('common');
  const { id } = useParams<{ id: string }>();
  const tenantId = id ?? '';

  const { data: tenant } = useTenant(tenantId);

  return (
    <main className="p-6 flex flex-col gap-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3">
        <Link
          to="/platform/tenants"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={16} className="rtl:scale-x-[-1]" />
          {t('platform.back_to_tenants')}
        </Link>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="text-2xl font-bold text-foreground">
          {tenant?.name ?? t('platform.loading')}
        </h1>
        {tenant && <TenantStatusBadge status={tenant.status} />}
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">{t('platform.tab_overview')}</TabsTrigger>
          <TabsTrigger value="users">{t('platform.tab_users')}</TabsTrigger>
          <TabsTrigger value="usage">{t('platform.tab_usage')}</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
          <OverviewTab tenantId={tenantId} />
        </TabsContent>
        <TabsContent value="users">
          <UsersTab tenantId={tenantId} />
        </TabsContent>
        <TabsContent value="usage">
          <UsageTab tenantId={tenantId} />
        </TabsContent>
      </Tabs>
    </main>
  );
}

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@item-bank/ui';
import type { CreateTenantData, TenantPlan } from '@item-bank/types';
import { useCreateTenant } from './hooks/usePlatform';

// ─── Validation schema ────────────────────────────────────────────────────────

const createTenantSchema = z.object({
  name: z.string().min(1, 'field_required'),
  slug: z
    .string()
    .min(1, 'field_required')
    .regex(/^[a-z0-9-]+$/, 'slug_pattern'),
  plan: z.enum(['starter', 'growth', 'enterprise'] as const),
  // Kept as string — the <input type="number"> value is always a string.
  // Conversion to number happens in onSubmit before the API call.
  seats: z
    .string()
    .min(1, 'field_required')
    .refine((val) => Number.isInteger(Number(val)) && Number(val) >= 1, 'seats_min'),
  admin_email: z.string().min(1, 'field_required').email('email_invalid'),
  admin_first_name: z.string().min(1, 'field_required'),
  admin_last_name: z.string().min(1, 'field_required'),
});

type FormValues = z.infer<typeof createTenantSchema>;

// ─── Slug auto-generation helper ──────────────────────────────────────────────

/** Converts an org name into a URL-safe slug. */
function toSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// ─── Page ─────────────────────────────────────────────────────────────────────

/**
 * Form page for creating a new tenant organisation.
 * On success it shows a sonner toast with the generated admin credentials
 * and navigates to the new tenant's detail page.
 */
export default function CreateTenantPage() {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const { mutate, isPending, isError, error } = useCreateTenant();

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(createTenantSchema),
    defaultValues: {
      name: '',
      slug: '',
      plan: 'starter',
      seats: '10',
      admin_email: '',
      admin_first_name: '',
      admin_last_name: '',
    },
  });

  // Auto-generate slug from org name.
  const nameValue = watch('name');
  useEffect(() => {
    setValue('slug', toSlug(nameValue), { shouldValidate: false });
  }, [nameValue, setValue]);

  const onSubmit = handleSubmit((values) => {
    const data: CreateTenantData = {
      name: values.name,
      slug: values.slug,
      plan: values.plan as TenantPlan,
      // Convert the validated string to a number before sending to the API.
      seats: Number(values.seats),
      admin_email: values.admin_email,
      admin_first_name: values.admin_first_name,
      admin_last_name: values.admin_last_name,
    };

    mutate(data, {
      onSuccess: (result) => {
        toast.success(t('platform.create_success_title'), {
          description: t('platform.create_success_body', {
            email: result.admin_email,
            password: result.admin_temp_password,
          }),
          duration: 15000,
        });
        navigate(`/platform/tenants/${result.tenant.id}`);
      },
    });
  });

  return (
    <main className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-foreground mb-6">{t('platform.create_title')}</h1>

      <form onSubmit={onSubmit} className="flex flex-col gap-5">
        {/* Org Name */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="ct-name">{t('platform.field_org_name')}</Label>
          <Input id="ct-name" className="bg-input" aria-invalid={!!errors.name} {...register('name')} />
          {errors.name && <p className="text-sm text-destructive">{t(`platform.${errors.name.message}`)}</p>}
        </div>

        {/* Slug */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="ct-slug">{t('platform.field_slug')}</Label>
          <Input id="ct-slug" className="bg-input font-mono" aria-invalid={!!errors.slug} {...register('slug')} />
          {errors.slug && <p className="text-sm text-destructive">{t(`platform.${errors.slug.message}`)}</p>}
        </div>

        {/* Plan */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="ct-plan">{t('platform.field_plan')}</Label>
          <Controller
            name="plan"
            control={control}
            render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger id="ct-plan">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="starter">{t('platform.plan_starter')}</SelectItem>
                  <SelectItem value="growth">{t('platform.plan_growth')}</SelectItem>
                  <SelectItem value="enterprise">{t('platform.plan_enterprise')}</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>

        {/* Seats */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="ct-seats">{t('platform.field_seats')}</Label>
          <Input id="ct-seats" type="number" min={1} className="bg-input" aria-invalid={!!errors.seats} {...register('seats')} />
          {errors.seats && <p className="text-sm text-destructive">{t(`platform.${errors.seats.message}`)}</p>}
        </div>

        {/* Admin Email */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="ct-admin-email">{t('platform.field_admin_email')}</Label>
          <Input id="ct-admin-email" type="email" className="bg-input" aria-invalid={!!errors.admin_email} {...register('admin_email')} />
          {errors.admin_email && <p className="text-sm text-destructive">{t(`platform.${errors.admin_email.message}`)}</p>}
        </div>

        {/* Admin First Name */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="ct-first">{t('platform.field_admin_first_name')}</Label>
          <Input id="ct-first" className="bg-input" aria-invalid={!!errors.admin_first_name} {...register('admin_first_name')} />
          {errors.admin_first_name && <p className="text-sm text-destructive">{t(`platform.${errors.admin_first_name.message}`)}</p>}
        </div>

        {/* Admin Last Name */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="ct-last">{t('platform.field_admin_last_name')}</Label>
          <Input id="ct-last" className="bg-input" aria-invalid={!!errors.admin_last_name} {...register('admin_last_name')} />
          {errors.admin_last_name && <p className="text-sm text-destructive">{t(`platform.${errors.admin_last_name.message}`)}</p>}
        </div>

        {isError && (
          <p className="text-sm text-destructive">
            {error instanceof Error ? error.message : t('platform.create_error')}
          </p>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>
            {t('platform.cancel')}
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? t('platform.creating') : t('platform.create_org')}
          </Button>
        </div>
      </form>
    </main>
  );
}

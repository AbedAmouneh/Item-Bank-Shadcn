import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@item-bank/ui';
import type { Tenant } from '@item-bank/types';
import { TenantStatusBadge } from './TenantStatusBadge';

interface TenantCardProps {
  tenant: Tenant;
}

/**
 * A compact card for a single tenant, used in the dashboard recent-activity list.
 * Clicking it navigates to the tenant detail page.
 */
export function TenantCard({ tenant }: TenantCardProps) {
  const { t } = useTranslation('common');

  const planLabel =
    tenant.plan === 'starter'
      ? t('platform.plan_starter')
      : tenant.plan === 'growth'
        ? t('platform.plan_growth')
        : t('platform.plan_enterprise');

  const formattedDate = new Date(tenant.created_at).toLocaleDateString();

  return (
    <Link to={`/platform/tenants/${tenant.id}`}>
      <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
        <CardContent className="flex items-center justify-between gap-4 py-3 px-4">
          <div className="min-w-0 flex-1">
            <p className="font-medium text-sm truncate">{tenant.name}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {planLabel} · {formattedDate}
            </p>
          </div>
          <TenantStatusBadge status={tenant.status} />
        </CardContent>
      </Card>
    </Link>
  );
}

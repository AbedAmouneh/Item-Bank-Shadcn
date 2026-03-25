import { useTranslation } from 'react-i18next';
import { Badge } from '@item-bank/ui';
import type { TenantStatus } from '@item-bank/types';

interface TenantStatusBadgeProps {
  status: TenantStatus;
}

/** Renders a coloured badge for a tenant status value. */
export function TenantStatusBadge({ status }: TenantStatusBadgeProps) {
  const { t } = useTranslation('common');

  const label = t(`platform.status_${status}`);

  switch (status) {
    case 'active':
      return (
        <Badge className="bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30">
          {label}
        </Badge>
      );
    case 'trial':
      return (
        <Badge className="bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500/30">
          {label}
        </Badge>
      );
    case 'suspended':
      return (
        <Badge className="bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30">
          {label}
        </Badge>
      );
  }
}

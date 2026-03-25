import { useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus, ArrowUpDown } from 'lucide-react';
import {
  Button,
  Input,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@item-bank/ui';
import type { GetTenantsParams, TenantPlan } from '@item-bank/types';
import { useTenants } from './hooks/usePlatform';
import { TenantStatusBadge } from './components/TenantStatusBadge';

type SortField = 'name' | 'created_at' | 'seats_used';

function planLabel(plan: TenantPlan, t: (k: string) => string): string {
  if (plan === 'starter') return t('platform.plan_starter');
  if (plan === 'growth') return t('platform.plan_growth');
  return t('platform.plan_enterprise');
}

/**
 * Searchable, sortable table of all tenant organisations.
 * Used by platform_role users to browse and navigate to tenant detail.
 */
export default function TenantsListPage() {
  const { t } = useTranslation('common');
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortField>('created_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const params: GetTenantsParams = {
    search: search || undefined,
    sort_by: sortBy,
    sort_dir: sortDir,
    per_page: 50,
  };

  const { data, isLoading, isError } = useTenants(params);
  const tenants = data?.items ?? [];

  const handleSort = useCallback(
    (field: SortField) => {
      if (sortBy === field) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortBy(field);
        setSortDir('asc');
      }
    },
    [sortBy],
  );

  return (
    <main className="p-6 flex flex-col gap-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-2xl font-bold text-foreground">{t('platform.tenants_title')}</h1>
        <Button onClick={() => navigate('/platform/tenants/new')}>
          <Plus size={16} className="me-1.5" />
          {t('platform.create_org')}
        </Button>
      </div>

      {/* Search */}
      <Input
        placeholder={t('platform.search_placeholder')}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm bg-input"
      />

      {/* Table */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        {isLoading && (
          <p className="p-6 text-sm text-muted-foreground">{t('platform.loading')}</p>
        )}
        {isError && (
          <p className="p-6 text-sm text-destructive">{t('platform.load_error')}</p>
        )}
        {!isLoading && !isError && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <button
                    className="flex items-center gap-1 hover:text-foreground transition-colors"
                    onClick={() => handleSort('name')}
                  >
                    {t('platform.col_name')}
                    <ArrowUpDown size={14} />
                  </button>
                </TableHead>
                <TableHead>{t('platform.col_slug')}</TableHead>
                <TableHead>{t('platform.col_plan')}</TableHead>
                <TableHead>
                  <button
                    className="flex items-center gap-1 hover:text-foreground transition-colors"
                    onClick={() => handleSort('seats_used')}
                  >
                    {t('platform.col_seats')}
                    <ArrowUpDown size={14} />
                  </button>
                </TableHead>
                <TableHead>{t('platform.col_status')}</TableHead>
                <TableHead>
                  <button
                    className="flex items-center gap-1 hover:text-foreground transition-colors"
                    onClick={() => handleSort('created_at')}
                  >
                    {t('platform.col_created')}
                    <ArrowUpDown size={14} />
                  </button>
                </TableHead>
                <TableHead>{t('platform.col_actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tenants.map((tenant) => (
                <TableRow key={tenant.id}>
                  <TableCell className="font-medium">{tenant.name}</TableCell>
                  <TableCell className="text-muted-foreground text-sm font-mono">
                    {tenant.slug}
                  </TableCell>
                  <TableCell>{planLabel(tenant.plan, t)}</TableCell>
                  <TableCell>
                    {t('platform.seats_display', {
                      used: tenant.seats_used,
                      total: tenant.seats_purchased,
                    })}
                  </TableCell>
                  <TableCell>
                    <TenantStatusBadge status={tenant.status} />
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {new Date(tenant.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Link
                      to={`/platform/tenants/${tenant.id}`}
                      className="text-sm text-primary hover:underline"
                    >
                      {t('platform.view')}
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </main>
  );
}

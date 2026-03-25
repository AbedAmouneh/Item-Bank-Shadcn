import { type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Building2, Users, CheckCircle2, Armchair, Plus } from 'lucide-react';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@item-bank/ui';
import { usePlatformStats, useTenants } from './hooks/usePlatform';
import { TenantCard } from './components/TenantCard';

// ─── Stat card ────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: number | undefined;
  icon: ReactNode;
  isLoading: boolean;
}

function StatCard({ label, value, icon, isLoading }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <span className="text-muted-foreground">{icon}</span>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-8 w-24 rounded bg-muted animate-pulse" />
        ) : (
          <p className="text-3xl font-bold">{value ?? '—'}</p>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

/**
 * Real platform dashboard — stats row + recent tenants list.
 * Replaces the Batch 1B placeholder.
 */
export default function PlatformDashboardPage() {
  const { t } = useTranslation('common');
  const navigate = useNavigate();

  const { data: stats, isLoading: statsLoading } = usePlatformStats();
  // Fetch the 10 most recently created tenants, sorted newest-first.
  const { data: recentPage, isLoading: recentLoading } = useTenants({
    per_page: 10,
    sort_by: 'created_at',
    sort_dir: 'desc',
  });

  const recentTenants = recentPage?.items ?? [];

  return (
    <main className="p-6 flex flex-col gap-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-2xl font-bold text-foreground">{t('platform.dashboard_title')}</h1>
        <Button onClick={() => navigate('/platform/tenants/new')}>
          <Plus size={16} className="me-1.5" />
          {t('platform.create_org')}
        </Button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard
          label={t('platform.total_orgs')}
          value={stats?.total_orgs}
          icon={<Building2 size={18} />}
          isLoading={statsLoading}
        />
        <StatCard
          label={t('platform.active_orgs')}
          value={stats?.active_orgs}
          icon={<CheckCircle2 size={18} />}
          isLoading={statsLoading}
        />
        <StatCard
          label={t('platform.total_users')}
          value={stats?.total_users}
          icon={<Users size={18} />}
          isLoading={statsLoading}
        />
        <StatCard
          label={t('platform.total_seats_used')}
          value={stats?.total_seats_used}
          icon={<Armchair size={18} />}
          isLoading={statsLoading}
        />
      </div>

      {/* Recent tenants */}
      <section>
        <h2 className="text-base font-semibold mb-3">{t('platform.recent_tenants')}</h2>
        {recentLoading && (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />
            ))}
          </div>
        )}
        {!recentLoading && recentTenants.length === 0 && (
          <p className="text-sm text-muted-foreground">{t('platform.load_error')}</p>
        )}
        {!recentLoading && recentTenants.length > 0 && (
          <div className="flex flex-col gap-2">
            {recentTenants.map((tenant) => (
              <TenantCard key={tenant.id} tenant={tenant} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

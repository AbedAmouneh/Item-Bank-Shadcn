import { useCallback } from 'react';
import { useNavigate, Outlet, NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LogOut, LayoutDashboard, Building2 } from 'lucide-react';
import { logout } from '@item-bank/api';
import { useAuth } from '@item-bank/auth';
import { HeaderPreferenceButtons } from '@item-bank/ui';

/**
 * Navigation shell for the platform world (super_admin / sales area).
 *
 * Header contains: logo, nav links (Dashboard + Organisations), user avatar, logout.
 * Contains zero redirect logic — that lives in PlatformRoute.
 */
export default function PlatformShell() {
  const { t } = useTranslation('common');
  const { user, clearSession } = useAuth();
  const navigate = useNavigate();

  const handleLogout = useCallback(async () => {
    try {
      await logout();
    } finally {
      clearSession();
      navigate('/login', { replace: true });
    }
  }, [clearSession, navigate]);

  const emailLocal = (user?.email ?? '').split('@')[0];

  return (
    <div className="w-full min-w-0 overflow-hidden">
      <header className="w-full h-16 bg-white dark:bg-[hsl(var(--nav-background))] border-b border-border shadow-nav px-4 md:px-6 flex items-center justify-between gap-4">
        {/* Logo + nav */}
        <div className="flex items-center gap-6 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center font-bold text-lg w-8 h-8 rounded-lg bg-primary text-white">
              A
            </div>
          </div>
          <nav className="hidden sm:flex items-center gap-1" aria-label="Platform navigation">
            <NavLink
              to="/platform/dashboard"
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-accent text-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                }`
              }
            >
              <LayoutDashboard size={15} />
              {t('platform.nav_dashboard')}
            </NavLink>
            <NavLink
              to="/platform/tenants"
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-accent text-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                }`
              }
            >
              <Building2 size={15} />
              {t('platform.nav_tenants')}
            </NavLink>
          </nav>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2 shrink-0">
          <HeaderPreferenceButtons />

          <div className="flex items-center gap-2 py-1 px-2 rounded-xl">
            <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary text-white text-xs font-semibold">
              {emailLocal.slice(0, 2).toUpperCase()}
            </div>
            <span className="hidden sm:block text-sm font-medium text-foreground">
              {emailLocal}
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center justify-center h-9 w-9 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            aria-label={t('table_actions.logout')}
          >
            <LogOut size={18} className="rtl:scale-x-[-1]" />
          </button>
        </div>
      </header>
      <Outlet />
    </div>
  );
}

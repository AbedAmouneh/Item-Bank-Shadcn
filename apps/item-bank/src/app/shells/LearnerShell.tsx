import { useCallback } from 'react';

import { useNavigate, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LogOut, Pencil } from 'lucide-react';

import { logout } from '@item-bank/api';
import { useAuth } from '@item-bank/auth';
import { cn, HeaderPreferenceButtons } from '@item-bank/ui';

const AUTHORING_ROLES = ['org_admin', 'author', 'reviewer', 'admin', 'user'];

/**
 * Navigation shell for the learner world.
 *
 * Minimal nav — no item banks, review queue, or any authoring tools.
 * Shows a "Switch to Authoring" button only when the user also holds an
 * authoring role (dual-role users).
 * Contains zero redirect logic — that lives in LearnerRoute.
 */
export default function LearnerShell() {
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

  const handleSwitchToAuthoring = useCallback(() => {
    localStorage.setItem('last-mode', 'author');
    navigate('/dashboard');
  }, [navigate]);

  const hasAuthoringRole =
    user?.roles.some((r) => AUTHORING_ROLES.includes(r)) ?? false;
  const emailLocal = (user?.email ?? '').split('@')[0];

  return (
    <div className="w-full min-w-0 overflow-hidden">
      <header className="w-full h-16 bg-white dark:bg-[hsl(var(--nav-background))] border-b border-border shadow-nav px-4 md:px-6 flex items-center justify-between gap-4">
        {/* Logo + brand */}
        <div className="flex items-center gap-3 shrink-0">
          <img
            src="/york-e-logo.png"
            alt="eYork E-Learning"
            className="h-12 w-auto object-contain"
          />
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2 shrink-0">
          <HeaderPreferenceButtons />

          {/* Switch to Authoring — only shown for dual-role users */}
          {hasAuthoringRole && (
            <button
              onClick={handleSwitchToAuthoring}
              className={cn(
                'flex items-center gap-2 py-1.5 px-3 rounded-lg text-sm font-medium',
                'text-muted-foreground hover:text-foreground hover:bg-accent transition-colors',
              )}
              aria-label={t('learner_shell.switch_to_authoring')}
            >
              <Pencil size={16} />
              <span className="hidden sm:block">{t('learner_shell.switch_to_authoring')}</span>
            </button>
          )}

          {/* User avatar */}
          <div
            className="flex items-center gap-2 py-1 px-2 rounded-xl cursor-pointer hover:bg-accent transition-colors"
            onClick={() => navigate('/profile/edit')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && navigate('/profile/edit')}
            aria-label={t('learner_shell.go_to_profile')}
          >
            <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary text-white text-xs font-semibold">
              {emailLocal.slice(0, 2).toUpperCase()}
            </div>
            <span className="hidden sm:block text-sm font-medium text-foreground">
              {emailLocal}
            </span>
          </div>

          {/* Logout */}
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

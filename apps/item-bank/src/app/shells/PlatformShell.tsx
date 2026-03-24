import { useCallback } from 'react';

import { useNavigate, Outlet } from 'react-router-dom';
import { LogOut } from 'lucide-react';

import { logout } from '@item-bank/api';
import { useAuth } from '@item-bank/auth';

/**
 * Navigation shell for the platform world (super_admin / sales area).
 *
 * Minimal nav — shows only the logo, section label, user avatar, and logout.
 * Contains zero redirect logic — that lives in PlatformRoute.
 */
export default function PlatformShell() {
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
        {/* Logo + brand */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center justify-center font-bold text-lg w-8 h-8 rounded-lg bg-primary text-white">
            A
          </div>
          <span className="hidden sm:block font-semibold text-base text-foreground">
            Platform Dashboard
          </span>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2 shrink-0">
          {/* User avatar */}
          <div className="flex items-center gap-2 py-1 px-2 rounded-xl">
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
            aria-label="Logout"
          >
            <LogOut size={18} className="rtl:scale-x-[-1]" />
          </button>
        </div>
      </header>
      <Outlet />
    </div>
  );
}

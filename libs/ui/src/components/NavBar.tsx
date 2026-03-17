import { useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Bell,
  Maximize,
  Minimize,
  Moon,
  Sun,
  Languages,
  LogOut,
  Menu as MenuIcon,
} from 'lucide-react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';
import { cn } from '../lib/utils';
import { useSwitchTheme, useThemeMode } from '../hooks/theme';

const navItems = [
  { labelKey: 'nav.dashboard', path: '/dashboard' },
  { labelKey: 'nav.projects', path: '/projects' },
  { labelKey: 'nav.itemBank', path: '/home' },
  { labelKey: 'nav.analytics', path: '/analytics' },
  { labelKey: 'nav.settings', path: '/settings' },
];

function IconTooltip({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          className="z-50 rounded-md bg-popover px-3 py-1.5 text-xs text-popover-foreground shadow-sm border border-border animate-fade-in"
          sideOffset={6}
        >
          {label}
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}

const iconBtnClass =
  'h-9 w-9 rounded-full flex items-center justify-center transition-colors cursor-pointer text-muted-foreground hover:text-foreground hover:bg-accent';

function NavBar() {
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { t, i18n } = useTranslation('common');
  const { switchTheme } = useSwitchTheme();
  const { mode } = useThemeMode();

  const handleNavItemClick = (path: string) => {
    navigate(path);
    setIsNavOpen(false);
  };

  const isSelected = (path: string) =>
    path === '/home'
      ? location.pathname === path
      : location.pathname.startsWith(path);

  const handleLanguageToggle = useCallback(() => {
    const newLang = i18n.language === 'en' ? 'ar' : 'en';
    i18n.changeLanguage(newLang);
    localStorage.setItem('lang', newLang);
  }, [i18n]);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    navigate('/login', { replace: true });
  }, [navigate]);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      setIsFullscreen(false);
      document.exitFullscreen();
    } else {
      setIsFullscreen(true);
      document.documentElement.requestFullscreen();
    }
  }, []);

  return (
    <TooltipPrimitive.Provider delayDuration={300}>
      <header className="w-full h-16 bg-white dark:bg-[hsl(var(--nav-background))] border-b border-border shadow-nav px-4 md:px-6 flex items-center justify-between gap-4">
        {/* Left — Logo + brand */}
        <div
          className="flex items-center gap-3 shrink-0 cursor-pointer py-1.5 px-2 -ml-2 rounded-xl hover:bg-accent transition-colors"
          onClick={() => navigate('/home')}
        >
          <div className="flex items-center justify-center font-bold text-lg w-8 h-8 rounded-lg bg-primary text-white">
            A
          </div>
          <span className="hidden sm:block font-semibold text-base text-foreground">
            {t('brand')}
          </span>
        </div>

        {/* Center — Nav pills (desktop) */}
        <nav className="hidden md:flex items-center justify-center flex-1">
          <div className="flex items-center gap-1 p-1 rounded-full bg-muted">
            {navItems.map((item) => (
              <button
                key={item.path}
                onClick={() => handleNavItemClick(item.path)}
                className={cn(
                  'py-2 px-5 rounded-full text-[0.9375rem] font-medium cursor-pointer whitespace-nowrap select-none transition-colors duration-150',
                  isSelected(item.path)
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-[hsl(var(--nav-pill-unselected-text))] hover:bg-accent hover:text-foreground'
                )}
              >
                {t(item.labelKey)}
              </button>
            ))}
          </div>
        </nav>

        {/* Mobile hamburger */}
        <DropdownMenuPrimitive.Root
          open={isNavOpen}
          onOpenChange={setIsNavOpen}
        >
          <DropdownMenuPrimitive.Trigger asChild>
            <button
              className={cn(iconBtnClass, 'flex md:hidden')}
              aria-label={t('actions.menu')}
            >
              <MenuIcon size={22} />
            </button>
          </DropdownMenuPrimitive.Trigger>
          <DropdownMenuPrimitive.Portal>
            <DropdownMenuPrimitive.Content
              className="min-w-[180px] rounded-xl border border-border shadow-card bg-card text-card-foreground p-1 z-50 animate-fade-in"
              sideOffset={6}
              align="start"
            >
              {navItems.map((item) => (
                <DropdownMenuPrimitive.Item
                  key={item.path}
                  className={cn(
                    'text-sm py-2 px-3 rounded-lg cursor-pointer hover:bg-accent focus:bg-accent transition-colors outline-none',
                    isSelected(item.path) && 'text-primary font-medium'
                  )}
                  onSelect={() => handleNavItemClick(item.path)}
                >
                  {t(item.labelKey)}
                </DropdownMenuPrimitive.Item>
              ))}
            </DropdownMenuPrimitive.Content>
          </DropdownMenuPrimitive.Portal>
        </DropdownMenuPrimitive.Root>

        {/* Right — Action icons */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Notifications */}
          <IconTooltip label={t('table_actions.notifications')}>
            <button className={iconBtnClass} aria-label={t('table_actions.notifications')}>
              <span className="relative">
                <Bell size={18} />
                <span className="absolute top-0 right-0 w-2 h-2 rounded-full bg-destructive" />
              </span>
            </button>
          </IconTooltip>

          {/* Fullscreen */}
          <IconTooltip label={t('table_actions.fullscreen')}>
            <button className={iconBtnClass} aria-label={t('table_actions.fullscreen')} onClick={toggleFullscreen}>
              {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
            </button>
          </IconTooltip>

          {/* Theme toggle */}
          <IconTooltip label={t('table_actions.theme')}>
            <button className={iconBtnClass} aria-label={t('table_actions.theme')} onClick={switchTheme}>
              {mode === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            </button>
          </IconTooltip>

          {/* Language toggle */}
          <IconTooltip label={t('table_actions.language')}>
            <button className={iconBtnClass} aria-label={t('table_actions.language')} onClick={handleLanguageToggle}>
              <Languages size={18} />
            </button>
          </IconTooltip>

          {/* Logout */}
          <IconTooltip label={t('table_actions.logout')}>
            <button className={iconBtnClass} aria-label={t('table_actions.logout')} onClick={logout}>
              <LogOut size={18} className="rtl:scale-x-[-1]" />
            </button>
          </IconTooltip>

          {/* User avatar */}
          <div
            className="flex items-center gap-2 py-1 px-2 rounded-xl cursor-pointer hover:bg-accent transition-colors"
            onClick={() => navigate('/profile/edit')}
          >
            <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary text-white text-xs font-semibold">
              JS
            </div>
            <span className="hidden sm:block text-sm font-medium text-foreground">
              J. Smith
            </span>
          </div>
        </div>
      </header>
    </TooltipPrimitive.Provider>
  );
}

export default NavBar;

import { useTranslation } from 'react-i18next';
import { useSwitchTheme } from '@item-bank/ui';
import { Globe, Sun, Moon } from 'lucide-react';

interface AuthPageWrapperProps {
  children: React.ReactNode;
}

export default function AuthPageWrapper({ children }: AuthPageWrapperProps) {
  const { i18n } = useTranslation();
  const { switchTheme, mode } = useSwitchTheme();

  const switchLanguage = () => {
    const next = i18n.language === 'en' ? 'ar' : 'en';
    i18n.changeLanguage(next);
    localStorage.setItem('lang', next);
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center relative"
      style={{ background: 'var(--auth-page-background)' }}
    >
      {/* Utility buttons — top-right, RTL-aware */}
      <div className="absolute top-5 end-5 flex gap-2">
        <button
          type="button"
          onClick={switchLanguage}
          aria-label="Switch language"
          className="p-2 rounded-full border border-border backdrop-blur-[10px] text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          style={{ backgroundColor: 'hsl(var(--auth-utility-button-bg))' }}
        >
          <Globe size={18} />
        </button>
        <button
          type="button"
          onClick={switchTheme}
          aria-label="Switch theme"
          className="p-2 rounded-full border border-border backdrop-blur-[10px] text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          style={{ backgroundColor: 'hsl(var(--auth-utility-button-bg))' }}
        >
          {mode === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>

      {children}
    </div>
  );
}

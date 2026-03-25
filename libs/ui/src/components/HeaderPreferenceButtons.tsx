import { useCallback } from 'react';

import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { Languages, Moon, Sun } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { useLanguage } from '../hooks/UseLanguage';
import { useSwitchTheme } from '../hooks/theme';
import { cn, navIconBtnClass } from '../lib/utils';

export interface HeaderPreferenceButtonsProps {
  className?: string;
  buttonClassName?: string;
}

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

/**
 * Shared header controls for language + theme toggles.
 * Reused across shells/pages so all users get the same behavior.
 */
export default function HeaderPreferenceButtons({
  className,
  buttonClassName,
}: HeaderPreferenceButtonsProps) {
  const { t } = useTranslation('common');
  const { language, setLanguage } = useLanguage();
  const { mode, switchTheme } = useSwitchTheme();

  const handleLanguageToggle = useCallback(() => {
    setLanguage(language === 'en' ? 'ar' : 'en');
  }, [language, setLanguage]);

  return (
    <TooltipPrimitive.Provider delayDuration={300}>
      <div className={cn('flex items-center gap-2', className)}>
        <IconTooltip label={t('table_actions.theme')}>
          <button
            className={cn(navIconBtnClass, buttonClassName)}
            aria-label={t('table_actions.theme')}
            onClick={switchTheme}
          >
            {mode === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>
        </IconTooltip>

        <IconTooltip label={t('table_actions.language')}>
          <button
            className={cn(navIconBtnClass, buttonClassName)}
            aria-label={t('table_actions.language')}
            onClick={handleLanguageToggle}
          >
            <Languages size={18} />
          </button>
        </IconTooltip>
      </div>
    </TooltipPrimitive.Provider>
  );
}

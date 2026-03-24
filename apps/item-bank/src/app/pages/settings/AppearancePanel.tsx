import { useTranslation } from 'react-i18next';
import { Sun, Moon, Monitor } from 'lucide-react';
import { cn, useTheme, useLanguage, type ThemePreference, type Language } from '@item-bank/ui';

type OptionCardProps<T extends string> = {
  value: T;
  current: T;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  onSelect: (value: T) => void;
};

/** A single clickable option tile used for both the theme and language selectors. */
function OptionCard<T extends string>({
  value,
  current,
  label,
  icon: Icon,
  onSelect,
}: OptionCardProps<T>) {
  const isSelected = value === current;

  return (
    <button
      type="button"
      onClick={() => onSelect(value)}
      className={cn(
        'flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-colors text-sm font-medium',
        isSelected
          ? 'border-primary bg-primary/5 text-foreground'
          : 'border-border text-muted-foreground hover:border-primary/40 hover:bg-accent hover:text-foreground'
      )}
      aria-pressed={isSelected}
    >
      {/* Radio dot indicator */}
      <span
        className={cn(
          'w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0',
          isSelected ? 'border-primary' : 'border-muted-foreground/40'
        )}
      >
        {isSelected && <span className="w-2 h-2 rounded-full bg-primary" />}
      </span>
      <Icon size={16} />
      {label}
    </button>
  );
}

/** Appearance settings panel — lets the user pick theme and display language. */
export default function AppearancePanel() {
  const { t } = useTranslation('common');
  const { theme, setTheme } = useTheme();
  const { language, setLanguage } = useLanguage();

  const themeOptions: { value: ThemePreference; label: string; icon: React.ComponentType<{ size?: number; className?: string }> }[] = [
    { value: 'light', label: t('settings.theme_light'), icon: Sun },
    { value: 'dark', label: t('settings.theme_dark'), icon: Moon },
    { value: 'system', label: t('settings.theme_system'), icon: Monitor },
  ];

  const languageOptions: { value: Language; label: string; icon: React.ComponentType<{ size?: number; className?: string }> }[] = [
    { value: 'en', label: t('settings.language_en'), icon: () => <span className="text-xs font-bold">EN</span> },
    { value: 'ar', label: t('settings.language_ar'), icon: () => <span className="text-xs font-bold">AR</span> },
  ];

  return (
    <div className="max-w-xl flex flex-col gap-8">
      {/* Theme section */}
      <section>
        <h2 className="text-base font-semibold text-foreground mb-1">
          {t('settings.theme_label')}
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          {t('settings.theme_description')}
        </p>
        <div className="flex flex-wrap gap-3">
          {themeOptions.map((opt) => (
            <OptionCard
              key={opt.value}
              value={opt.value}
              current={theme}
              label={opt.label}
              icon={opt.icon}
              onSelect={setTheme}
            />
          ))}
        </div>
      </section>

      {/* Language section */}
      <section>
        <h2 className="text-base font-semibold text-foreground mb-1">
          {t('settings.language_label')}
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          {t('settings.language_description')}
        </p>
        <div className="flex flex-wrap gap-3">
          {languageOptions.map((opt) => (
            <OptionCard
              key={opt.value}
              value={opt.value}
              current={language}
              label={opt.label}
              icon={opt.icon}
              onSelect={setLanguage}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

import { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

export type Language = 'en' | 'ar';

/**
 * Hook for reading and writing the active UI language.
 *
 * - Wraps react-i18next so consumers don't import i18n directly.
 * - Persists the choice in localStorage under key "lang" (same key used at app boot).
 * - Reactive: the returned `language` value updates whenever i18n language changes,
 *   whether the change came from this hook or from elsewhere (e.g. NavBar toggle).
 */
export function useLanguage() {
  const { i18n } = useTranslation();
  const [language, setLanguageState] = useState<Language>(
    i18n.language === 'ar' ? 'ar' : 'en'
  );

  // Stay in sync if another part of the app changes the language directly via i18n.
  useEffect(() => {
    const handleChange = (lang: string) => {
      setLanguageState(lang === 'ar' ? 'ar' : 'en');
    };
    i18n.on('languageChanged', handleChange);
    return () => {
      i18n.off('languageChanged', handleChange);
    };
  }, [i18n]);

  const setLanguage = useCallback(
    (lang: Language) => {
      i18n.changeLanguage(lang);
      localStorage.setItem('lang', lang);
    },
    [i18n]
  );

  return { language, setLanguage };
}

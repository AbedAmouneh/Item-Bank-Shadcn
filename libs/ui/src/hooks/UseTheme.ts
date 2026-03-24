import { useState, useEffect, useCallback } from 'react';
import { useThemeMode, type ThemeMode } from './theme';

/** The three options the user can choose in Settings — 'system' means "follow the OS". */
export type ThemePreference = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'ib-theme';

/** Reads the stored preference; falls back to the current applied mode so the
 *  Settings page always shows the correct radio selected on first visit. */
function getStoredPreference(currentMode: ThemeMode): ThemePreference {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
  return currentMode;
}

/** Resolves a preference to an actual applied mode. 'system' is determined
 *  by the OS prefers-color-scheme media query. */
function resolveMode(preference: ThemePreference): ThemeMode {
  if (preference === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return preference;
}

/**
 * Hook for reading and writing the theme preference from Settings.
 *
 * - Stores the preference in localStorage under key "ib-theme".
 * - Resolves 'system' to the actual OS mode and passes it to the shared ThemeModeContext.
 * - Listens for OS preference changes while 'system' is active so the app
 *   reacts without requiring a page reload.
 */
export function useTheme() {
  const { mode, setMode } = useThemeMode();
  const [theme, setThemeState] = useState<ThemePreference>(() =>
    getStoredPreference(mode)
  );

  // Apply the resolved mode (and re-apply if the OS preference changes when 'system' is set).
  useEffect(() => {
    const apply = () => setMode(resolveMode(theme));
    apply();

    if (theme === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      mq.addEventListener('change', apply);
      return () => mq.removeEventListener('change', apply);
    }
    return undefined;
  }, [theme, setMode]);

  const setTheme = useCallback((preference: ThemePreference) => {
    localStorage.setItem(STORAGE_KEY, preference);
    setThemeState(preference);
  }, []);

  return { theme, setTheme };
}

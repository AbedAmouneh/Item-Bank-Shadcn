import { createContext, useContext } from 'react';

export type ThemeMode = 'light' | 'dark';

type ThemeModeContextValue = {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
};

const ThemeModeContext = createContext<ThemeModeContextValue>({
  mode: 'light',
  setMode: (_mode: ThemeMode) => undefined,
});

export const ThemeModeProvider = ThemeModeContext.Provider;

export const useThemeMode = () => useContext(ThemeModeContext);

export const useSwitchTheme = () => {
  const { setMode, mode } = useThemeMode();
  const switchTheme = () => {
    setMode(mode === 'dark' ? 'light' : 'dark');
  };
  return { colorScheme: mode, switchTheme, mode };
};

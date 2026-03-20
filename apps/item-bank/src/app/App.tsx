import { useState, useEffect } from 'react';
import { BrowserRouter, Outlet, Routes, Route } from 'react-router-dom';
import {
  Login,
  ForgotPassword,
  ProtectedRoute,
  GuestRoute,
  NotFoundRedirect
} from '@item-bank/auth';
import { ThemeModeProvider, useThemeMode, type ThemeMode } from '@item-bank/ui';
import { ProfileSidebar } from '@item-bank/profile';
import i18n from '@item-bank/i18n';
import Home from './pages/Home';
import ProfileGeneral from './pages/profile/General';
import ChangePassword from './pages/profile/ChangePassword';
import MigrateToApi from '../db/MigrateToApi';

const STORAGE_KEY_THEME = 'theme-mode';

function getStoredThemeMode(): ThemeMode {
  const stored = localStorage.getItem(STORAGE_KEY_THEME);
  if (stored === 'dark' || stored === 'light') return stored;
  return 'light';
}

export default function App() {
  const [mode, setMode] = useState<ThemeMode>(getStoredThemeMode);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_THEME, mode);
  }, [mode]);

  return (
    <ThemeModeProvider value={{ mode, setMode }}>
      <AppShell>
        <BrowserRouter>
          <Routes>
            <Route element={<ProtectedRoute />}>
              <Route element={<AuthenticatedLayout />}>
                <Route path="/home" element={<Home />} />
                <Route path='/profile' element={<ProfileSidebar />}>
                  <Route path='edit' element={<ProfileGeneral />} />
                  <Route path='change-password' element={<ChangePassword />} />
                </Route>
              </Route>
            </Route>

            <Route element={<GuestRoute />}>
              <Route path="/login" element={<Login />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
            </Route>

            <Route path="*" element={<NotFoundRedirect />} />
          </Routes>
        </BrowserRouter>
      </AppShell>
    </ThemeModeProvider>
  );
}

/** Sits inside ProtectedRoute's Outlet and runs the one-time migration. */
function AuthenticatedLayout() {
  return (
    <>
      <MigrateToApi />
      <Outlet />
    </>
  );
}

function AppShell({ children }: { children: React.ReactNode }) {
  const { mode } = useThemeMode();

  useEffect(() => {
    const root = document.documentElement;
    if (mode === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [mode]);

  useEffect(() => {
    const updateDir = () => {
      document.documentElement.dir = i18n.language === 'ar' ? 'rtl' : 'ltr';
    };
    updateDir();
    i18n.on('languageChanged', updateDir);
    return () => {
      i18n.off('languageChanged', updateDir);
    };
  }, []);

  return <>{children}</>;
}

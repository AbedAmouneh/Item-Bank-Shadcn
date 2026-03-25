import { useState, useEffect } from 'react';
import { BrowserRouter, Outlet, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import {
  Login,
  ForgotPassword,
  SignUp,
  AuthoringRoute,
  PlatformRoute,
  LearnerRoute,
  RequireRole,
  GuestRoute,
  NotFoundRedirect,
} from '@item-bank/auth';
import { ThemeModeProvider, useThemeMode, type ThemeMode } from '@item-bank/ui';
import { ProfileSidebar } from '@item-bank/profile';
import i18n from '@item-bank/i18n';
import GamesLobby, {
  QuizArcade,
  MemoryMatch,
  AnswerRunner,
  PixelCraft,
  PixelDash,
  StackAttack,
  MeteorCatcher,
} from '@item-bank/games';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import Settings from './pages/Settings';
import Analytics from './pages/Analytics';
import ItemBanksList from './pages/ItemBanksList';
import ItemBankDetail from './pages/ItemBankDetail';
import CoursesList from './pages/courses/CoursesList';
import CourseDetail from './pages/courses/CourseDetail';
import CourseEditor from './pages/courses/CourseEditor';
import AdminTags from './pages/AdminTags';
import AdminReview from './pages/AdminReview';
import AdminAuditLog from './pages/AdminAuditLog';
import QuestionPreview from './pages/QuestionPreview';
import ProfileGeneral from './pages/profile/General';
import ChangePassword from './pages/profile/ChangePassword';
import AdminUsers from './pages/admin/Users';
import RoleSelectPage from './pages/RoleSelectPage';
import MyLearningPage from './pages/learn/MyLearningPage';
import CoursePlayerPage from './pages/learn/CoursePlayerPage';
import ModulePage from './pages/learn/ModulePage';
import PreExamPage from './pages/learn/PreExamPage';
import ExamPage from './pages/learn/ExamPage';
import ExamResultsPage from './pages/learn/ExamResultsPage';
import AnswerReviewPage from './pages/learn/AnswerReviewPage';
import PlatformDashboardPage from './pages/platform/PlatformDashboardPage';
import AuthoringShell from './shells/AuthoringShell';
import LearnerShell from './shells/LearnerShell';
import PlatformShell from './shells/PlatformShell';
import MigrateToApi from '../db/MigrateToApi';
import ErrorBoundary from './ErrorBoundary';

const STORAGE_KEY_THEME = 'theme-mode';

function getStoredThemeMode(): ThemeMode {
  // Check the new preference key first (written by useTheme / Settings page).
  // 'system' is resolved against the OS preference at startup.
  const ibTheme = localStorage.getItem('ib-theme');
  if (ibTheme === 'light' || ibTheme === 'dark') return ibTheme;
  if (ibTheme === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  }
  // Legacy fallback for users who set theme before the Settings page existed.
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
      <Toaster richColors closeButton duration={5000} />
      <AppShell>
        <BrowserRouter>
          <Routes>
            {/* /role-select: inside AuthoringRoute (no shell) so unauthenticated
                users are redirected to /login and learner-only users are
                redirected to /learn/dashboard. Full-screen — no nav bar. */}
            <Route
              element={
                <ErrorBoundary>
                  <AuthoringRoute />
                </ErrorBoundary>
              }
            >
              <Route path="/role-select" element={<RoleSelectPage />} />
            </Route>

            {/* Platform world — super_admin and sales only */}
            <Route
              element={
                <ErrorBoundary>
                  <PlatformRoute />
                </ErrorBoundary>
              }
            >
              <Route element={<PlatformShell />}>
                <Route
                  path="/platform/dashboard"
                  element={<PlatformDashboardPage />}
                />
              </Route>
            </Route>

            {/* Learner world — learner role required */}
            <Route
              element={
                <ErrorBoundary>
                  <LearnerRoute />
                </ErrorBoundary>
              }
            >
              <Route element={<LearnerShell />}>
                <Route path="/learn/dashboard" element={<MyLearningPage />} />
                <Route path="/learn/courses/:courseId" element={<CoursePlayerPage />} />
                <Route path="/learn/courses/:courseId/module/:moduleId" element={<ModulePage />} />
                <Route path="/learn/exams/:assessmentId" element={<PreExamPage />} />
                <Route
                  path="/learn/exams/:assessmentId/results/:attemptId"
                  element={<ExamResultsPage />}
                />
                <Route
                  path="/learn/exams/:assessmentId/review/:attemptId"
                  element={<AnswerReviewPage />}
                />
              </Route>
              {/* Full-page takeover — no nav shell — must stay outside LearnerShell */}
              <Route path="/learn/exams/:assessmentId/take" element={<ExamPage />} />
            </Route>

            {/* Authoring world — org_admin, author, reviewer, admin, user */}
            <Route
              element={
                <ErrorBoundary>
                  <AuthoringRoute />
                </ErrorBoundary>
              }
            >
              <Route element={<AuthoringShell />}>
                {/* AuthenticatedLayout runs MigrateToApi (one-time DB→API data
                    migration). Must be preserved here. */}
                <Route element={<AuthenticatedLayout />}>
                  <Route path="/home" element={<Home />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/analytics" element={<Analytics />} />
                  <Route path="/item-banks" element={<ItemBanksList />} />
                  <Route path="/item-banks/:id" element={<ItemBankDetail />} />
                  <Route path="/projects" element={<CoursesList />} />
                  <Route path="/projects/:id" element={<CourseDetail />} />
                  <Route path="/projects/:id/edit" element={<CourseEditor />} />
                  <Route path="/admin/tags" element={<AdminTags />} />
                  <Route path="/admin/audit-log" element={<AdminAuditLog />} />
                  <Route
                    path="/questions/:id/preview"
                    element={<QuestionPreview />}
                  />
                  <Route path="/profile" element={<ProfileSidebar />}>
                    <Route path="edit" element={<ProfileGeneral />} />
                    <Route
                      path="change-password"
                      element={<ChangePassword />}
                    />
                  </Route>
                  <Route path="/games" element={<GamesLobby />} />
                  <Route path="/games/quiz-arcade" element={<QuizArcade />} />
                  <Route path="/games/memory-match" element={<MemoryMatch />} />
                  <Route
                    path="/games/answer-runner"
                    element={<AnswerRunner />}
                  />
                  <Route path="/games/pixel-craft" element={<PixelCraft />} />
                  <Route path="/games/pixel-dash" element={<PixelDash />} />
                  <Route path="/games/stack-attack" element={<StackAttack />} />
                  <Route
                    path="/games/meteor-catcher"
                    element={<MeteorCatcher />}
                  />
                  {/* Fine-grained role gates within the authoring world */}
                  <Route
                    path="/admin/users"
                    element={
                      <RequireRole roles={['org_admin', 'admin']}>
                        <AdminUsers />
                      </RequireRole>
                    }
                  />
                  <Route
                    path="/admin/review"
                    element={
                      <RequireRole roles={['org_admin', 'reviewer', 'admin']}>
                        <AdminReview />
                      </RequireRole>
                    }
                  />
                </Route>
              </Route>
            </Route>

            {/* Guest routes — redirect to /dashboard if already logged in */}
            <Route
              element={
                <ErrorBoundary>
                  <GuestRoute />
                </ErrorBoundary>
              }
            >
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<SignUp />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
            </Route>

            <Route path="*" element={<NotFoundRedirect />} />
          </Routes>
        </BrowserRouter>
      </AppShell>
    </ThemeModeProvider>
  );
}

/** Runs the one-time DB→API data migration. Preserved from original architecture. */
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
    if (mode === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
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

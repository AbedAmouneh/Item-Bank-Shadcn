export { default as AuthoringRoute } from './guards/AuthoringRoute';
export { default as PlatformRoute } from './guards/PlatformRoute';
export { default as LearnerRoute } from './guards/LearnerRoute';
export { default as RequireRole } from './guards/RequireRole';
export { default as GuestRoute } from './guards/GuestRoute';
export { default as NotFoundRedirect } from './guards/NotFoundRedirect';
export { default as Login } from './pages/Login';
export { default as SignUp } from './pages/SignUp';
export { default as ForgotPassword } from './pages/ForgotPassword';
export { AuthProvider } from './context/AuthContext';
export type { AuthContextValue } from './context/AuthContext';
// Re-exported from @item-bank/types so existing consumers that import via
// @item-bank/auth continue to work without changes.
export type { AuthUser } from '@item-bank/types';
export { useAuth } from './hooks/useAuth';

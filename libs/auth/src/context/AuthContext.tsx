import { createContext, useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';

import {
  clearCsrfToken,
  getMe,
  setCsrfToken,
} from '@item-bank/api';

/** The authenticated user shape used throughout the app. */
export interface AuthUser {
  id: string;
  email: string;
  /** The server always returns one of these two values. */
  role: 'admin' | 'user';
  is_active: boolean;
}

export interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  /** Derived: true when user is not null. */
  isAuthenticated: boolean;
  /**
   * Store a verified user + CSRF token after a successful login response.
   * Updates in-module CSRF state in @item-bank/api so future mutating
   * requests carry the correct header automatically.
   */
  setSession: (user: AuthUser, csrfToken: string) => void;
  /** Wipe local user state and clear the CSRF token on logout. */
  clearSession: () => void;
}

/**
 * Internal context object. Initialised to `null` so the `useAuth` hook
 * can detect when it is called outside of a provider and throw a helpful
 * error instead of silently returning undefined values.
 */
export const AuthContext = createContext<AuthContextValue | null>(null);

// ---------------------------------------------------------------------------
// AuthProvider
// ---------------------------------------------------------------------------

interface AuthProviderProps {
  children: ReactNode;
}

/**
 * Wrap the app (or a subtree) with AuthProvider to give descendant components
 * access to the current user via useAuth().
 *
 * On first render it silently calls GET /account/me. If a valid httpOnly
 * JWT cookie exists the server responds with the user payload and the app
 * boots in an already-authenticated state. If the cookie is missing or
 * expired the call fails and user is null — no redirect happens here; the
 * route guards handle that.
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // -- session helpers -------------------------------------------------------

  const clearSession = useCallback(() => {
    setUser(null);
    clearCsrfToken();
  }, []);

  const setSession = useCallback(
    (newUser: AuthUser, csrfToken: string) => {
      setUser(newUser);
      setCsrfToken(csrfToken);
    },
    [],
  );

  // -- initial hydration: check whether a JWT cookie already exists ----------

  useEffect(() => {
    let cancelled = false;

    getMe()
      .then((apiUser) => {
        if (cancelled) return;
        // The server's role field is a string; we cast to the known union
        // type because the API contract guarantees these two values.
        setUser({
          id: apiUser.id,
          email: apiUser.email,
          role: apiUser.role as 'admin' | 'user',
          is_active: apiUser.is_active,
        });
        setIsLoading(false);
      })
      .catch(() => {
        // 401 or network failure — user is not authenticated.
        if (cancelled) return;
        setUser(null);
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // -- listen for forced logout from the HTTP client -------------------------

  useEffect(() => {
    window.addEventListener('auth:logout', clearSession);
    return () => {
      window.removeEventListener('auth:logout', clearSession);
    };
  }, [clearSession]);

  // -- context value ---------------------------------------------------------

  const value: AuthContextValue = {
    user,
    isLoading,
    isAuthenticated: user !== null,
    setSession,
    clearSession,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

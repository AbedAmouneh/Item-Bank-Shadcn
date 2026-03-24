import { createContext, useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';

import type { AuthUser } from '@item-bank/types';
import {
  clearCsrfToken,
  getMe,
  refreshToken,
  setCsrfToken,
} from '@item-bank/api';

export type { AuthUser };

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

  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      try {
        const apiUser = await getMe();
        if (cancelled) return;
        setUser({
          id: apiUser.id,
          email: apiUser.email,
          role: apiUser.role,
          roles: apiUser.roles ?? [],
          tenant_id: apiUser.tenant_id,
          is_active: apiUser.is_active,
        });
        try {
          await refreshToken();
        } catch {
          // CSRF refresh failed — the user is still authenticated via the
          // cookie. Mutating requests may fail until the next login, but
          // we do not force a logout here.
        }
        if (cancelled) return;
        setIsLoading(false);
      } catch {
        if (cancelled) return;
        setUser(null);
        setIsLoading(false);
      }
    }

    hydrate();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    window.addEventListener('auth:logout', clearSession);
    return () => { window.removeEventListener('auth:logout', clearSession); };
  }, [clearSession]);

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

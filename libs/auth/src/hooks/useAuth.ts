import { useContext } from 'react';

import { AuthContext } from '../context/AuthContext';
import type { AuthContextValue } from '../context/AuthContext';

/**
 * Read the current auth state from the nearest AuthProvider.
 *
 * @throws If called outside of an AuthProvider tree — this prevents silent
 *         failures where a component gets undefined values and misbehaves.
 */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);

  if (ctx === null) {
    throw new Error(
      'useAuth must be called inside an <AuthProvider>. ' +
        'Make sure the component tree is wrapped with AuthProvider.',
    );
  }

  return ctx;
}

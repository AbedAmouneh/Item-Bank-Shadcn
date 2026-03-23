/**
 * usePostGameSession — saves a completed game session to the server.
 *
 * Wraps useMutation around saveGameSession. The returned `save` function
 * accepts a `CreateGameSessionPayload` (which adds an optional `extra_data`
 * bag to the standard `GameSessionData`) and strips that field before
 * calling the API so the `libs/api` layer stays unchanged.
 *
 * Usage pattern (call exactly once when phase reaches 'results'):
 *
 *   const { save, saving, saved, error } = usePostGameSession();
 *
 *   useEffect(() => {
 *     if (phase === 'results' && !saved) {
 *       save({ game: 'quiz-arcade', score, accuracy, total_qs, correct_qs });
 *     }
 *   }, [phase]);
 */

import { useMutation } from '@tanstack/react-query';
import { saveGameSession } from '@item-bank/api';
import type { GameSessionData } from '@item-bank/api';

/**
 * Extends the standard game session payload with an optional free-form
 * metadata bag. `extra_data` is stripped before the API call — it exists
 * only so callers can attach game-specific context for local use.
 */
export interface CreateGameSessionPayload extends GameSessionData {
  extra_data?: Record<string, unknown>;
}

/**
 * Hook for saving a completed game session once per game over screen.
 *
 * @returns save     - Async function to persist the session.
 * @returns saving   - True while the request is in flight.
 * @returns saved    - True after a successful save (use as idempotency guard).
 * @returns error    - Error message string, or null if none.
 */
export function usePostGameSession(): {
  save: (payload: CreateGameSessionPayload) => Promise<void>;
  saving: boolean;
  saved: boolean;
  error: string | null;
} {
  const mutation = useMutation({ mutationFn: saveGameSession });

  const save = async (payload: CreateGameSessionPayload): Promise<void> => {
    // Strip extra_data — saveGameSession only accepts GameSessionData fields.
    const { extra_data: _, ...sessionData } = payload;
    await mutation.mutateAsync(sessionData);
  };

  return {
    save,
    saving: mutation.isPending,
    saved: mutation.isSuccess,
    error: mutation.error instanceof Error ? mutation.error.message : null,
  };
}

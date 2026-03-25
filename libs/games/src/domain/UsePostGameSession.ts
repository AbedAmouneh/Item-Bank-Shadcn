/**
 * usePostGameSession — saves a completed game session to the server.
 *
 * Wraps useMutation around saveGameSession. The returned `save` function
 * accepts a `GameSessionData` payload (including the optional `extra_data`
 * bag) and forwards it directly to the API.
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
 * Hook for saving a completed game session once per game over screen.
 *
 * @returns save     - Async function to persist the session.
 * @returns saving   - True while the request is in flight.
 * @returns saved    - True after a successful save (use as idempotency guard).
 * @returns error    - Error message string, or null if none.
 */
export function usePostGameSession(): {
  save: (payload: GameSessionData) => Promise<void>;
  saving: boolean;
  saved: boolean;
  error: string | null;
} {
  const mutation = useMutation({ mutationFn: saveGameSession });

  const save = async (payload: GameSessionData): Promise<void> => {
    await mutation.mutateAsync(payload);
  };

  return {
    save,
    saving: mutation.isPending,
    saved: mutation.isSuccess,
    error: mutation.error instanceof Error ? mutation.error.message : null,
  };
}

/**
 * Data hook for game question fetching.
 *
 * Wraps TanStack Query around `getQuestions` with game-specific defaults:
 * - always filters to `status: 'published'`
 * - caps at 20 questions per session
 * - caches for 60 s so mid-game re-renders don't trigger new requests
 */

import { useQuery } from '@tanstack/react-query';
import { getQuestions } from '@item-bank/api';
import type { GetQuestionsParams } from '@item-bank/api';

/**
 * Fetch a list of published questions suitable for a game session.
 *
 * @param params - Caller-supplied filters (type, tag_ids, item_bank_id, etc.).
 *                 `status` and `limit` are always overridden to game defaults.
 */
export function useGameQuestions(params: GetQuestionsParams) {
  return useQuery({
    queryKey: ['game-questions', params],
    queryFn: () =>
      getQuestions({
        ...params,
        status: 'published',
        limit: 20,
      }),
    staleTime: 60_000,
  });
}

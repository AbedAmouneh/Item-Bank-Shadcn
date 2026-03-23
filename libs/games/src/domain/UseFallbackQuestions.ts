/**
 * useFallbackQuestions — wraps useGameQuestions with a demo-data fallback.
 *
 * When the API returns zero questions (empty bank, unpublished content, or a
 * network error) this hook transparently substitutes the caller-supplied
 * fallback array so games never display a broken empty state.
 *
 * The `source` discriminant lets callers narrow the `data` type correctly:
 *   if (source === 'api')      → data is Question[]         (id: number)
 *   if (source === 'fallback') → data is FallbackQuestion[] (id: string)
 */

import type { Question } from '@item-bank/api';
import { useGameQuestions } from './hooks';
import type { GameQuestionsParams, FallbackQuestion } from './types';

/** Discriminated union returned by useFallbackQuestions. */
export type FallbackResult =
  | { data: Question[];         source: 'api';      isLoading: boolean }
  | { data: FallbackQuestion[]; source: 'fallback';  isLoading: boolean };

/**
 * Fetch questions with automatic fallback to a hardcoded demo pack.
 *
 * @param params   - Filter params forwarded to useGameQuestions.
 * @param fallback - Demo questions shown when the API returns nothing.
 * @returns        Questions + a `source` tag indicating origin.
 */
export function useFallbackQuestions(
  params: GameQuestionsParams,
  fallback: FallbackQuestion[],
): FallbackResult {
  const { data, isLoading } = useGameQuestions(params);
  const items = data?.items ?? [];

  if (!isLoading && items.length === 0) {
    return { data: fallback, source: 'fallback', isLoading: false };
  }

  return { data: items, source: 'api', isLoading };
}

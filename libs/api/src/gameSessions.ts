/**
 * Game session API functions.
 *
 * Handles score persistence (POST /game-sessions) and leaderboard reads
 * (GET /leaderboard). Both endpoints are authenticated and use the same
 * HTTP client as the rest of the API.
 */

import { apiRequest } from './client';

/** Server response envelope — every success response is wrapped in this. */
interface Envelope<T> {
  success: boolean;
  data: T;
}

// ─── Types ───────────────────────────────────────────────────────────────────

/** Identifies a game in API calls. Matches the backend's accepted values. */
export type GameId = 'quiz-arcade' | 'memory-match' | 'answer-runner';

/** Payload sent to POST /game-sessions to record a completed game. */
export interface GameSessionData {
  game: GameId;
  score: number;
  /** Percentage of correct answers, 0–100. */
  accuracy: number;
  /** Total questions (or pairs) in the session. */
  total_qs: number;
  /** Correctly answered questions (or matched pairs). */
  correct_qs: number;
  /** The item bank the game was scoped to, if any. */
  item_bank_id?: number;
}

/** One row in the leaderboard returned by GET /leaderboard. */
export interface LeaderboardEntry {
  rank: number;
  username: string;
  score: number;
  accuracy: number;
  correct_qs: number;
  total_qs: number;
  played_at: string;
}

// ─── Functions ───────────────────────────────────────────────────────────────

/**
 * Save a completed game session to the server.
 *
 * Errors are swallowed by the caller via TanStack Query's silent-fail pattern
 * (`mutate`, not `mutateAsync`) — the results screen is never blocked.
 *
 * @param data - The session summary to persist.
 */
export async function saveGameSession(data: GameSessionData): Promise<void> {
  await apiRequest<unknown>('/game-sessions', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Fetch the top-10 leaderboard for a game within an item bank.
 *
 * @param game       - Which game's scores to retrieve.
 * @param itemBankId - The item bank scope.
 * @returns          Up to 10 ranked entries.
 */
export async function getLeaderboard(
  game: GameId,
  itemBankId: number,
): Promise<LeaderboardEntry[]> {
  const qs = `?game=${encodeURIComponent(game)}&item_bank_id=${itemBankId}`;
  const envelope = await apiRequest<Envelope<LeaderboardEntry[]>>(`/leaderboard${qs}`);
  return envelope.data;
}

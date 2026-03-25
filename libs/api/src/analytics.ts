/**
 * Analytics API functions.
 *
 * Provides a single overview endpoint that aggregates question statistics,
 * game session metrics, and the top-10 global player leaderboard for the
 * admin dashboard. All calls require an authenticated admin session — the
 * server returns 403 for non-admin users.
 */

import { apiRequest } from './client';

/** Server response envelope shared across all endpoints. */
interface Envelope<T> {
  success: boolean;
  data: T;
}

// ─── Response Types ───────────────────────────────────────────────────────────

/** Count of questions belonging to a single question type. */
export interface QuestionTypeBreakdown {
  type: string;
  count: number;
}

/** Total session count for a single game. */
export interface GameSessionCount {
  game: string;
  count: number;
}

/** A single player's aggregated stats in the global leaderboard. */
export interface TopPlayer {
  rank: number;
  name: string;
  games_played: number;
  total_score: number;
}

/** Full analytics overview returned by GET /analytics/overview. */
export interface AnalyticsOverview {
  questions: {
    total: number;
    draft: number;
    pending_review: number;
    published: number;
    /** Breakdown by question type — may include entries with count 0. */
    by_type: QuestionTypeBreakdown[];
  };
  game_sessions: {
    total: number;
    /** The game ID that has the highest session count. */
    most_popular_game: string;
    unique_players: number;
    /** One entry per supported game. Always 6 entries. */
    by_game: GameSessionCount[];
  };
  /** Top 10 players ranked by total score across all games. */
  top_players: TopPlayer[];
}

// ─── Functions ───────────────────────────────────────────────────────────────

/**
 * Fetch the full analytics overview for the admin dashboard.
 *
 * Requires an active admin session. The server enforces this — calling this
 * function as a non-admin user will throw a 403 error.
 *
 * @returns Aggregated platform statistics.
 */
export async function getAnalyticsOverview(): Promise<AnalyticsOverview> {
  const envelope = await apiRequest<Envelope<AnalyticsOverview>>('/analytics/overview');
  return envelope.data;
}

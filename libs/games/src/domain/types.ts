/**
 * Shared types for the Games feature.
 *
 * These are game-layer types that wrap the raw `Question` from the API into
 * a shape each game engine can work with directly.
 */

import type { GetQuestionsParams, Question } from '@item-bank/api';

/** The phases a quiz game moves through — used as a state-machine enum. */
export type GameScreen =
  | 'idle'
  | 'countdown'
  | 'question'
  | 'answer_reveal'
  | 'game_over'
  | 'results';

/** A single answer choice presented to the player. */
export interface GameAnswer {
  id: string;
  text: string;
  isCorrect: boolean;
}

/**
 * A question flattened into a game-ready shape.
 * The raw `content` blob from the API is parsed into `answers`.
 */
export interface GameQuestion {
  id: number;
  text: string;
  type: string;
  answers: GameAnswer[];
}

/** Accumulated result after a full game session. */
export interface GameResult {
  score: number;
  total: number;
  correct: number;
  streak: number;
}

/** One face-up/down card in the Memory Match grid. */
export interface MemoryCard {
  /** Unique identifier for this card instance. */
  id: string;
  /** Two cards that share a pairId are a matching pair. */
  pairId: string;
  /** Text shown on the face of the card. */
  content: string;
  isFlipped: boolean;
  isMatched: boolean;
}

/** A single entry in the persisted per-game score history. */
export interface GameScoreEntry {
  score: number;
  correct: number;
  total: number;
  /** Accuracy as a whole-number percentage (0–100). */
  accuracy: number;
  /** ISO 8601 timestamp of when the game ended. */
  date: string;
}

/** One answer entity flying across the screen in Answer Runner. */
export interface RunnerAnswer {
  id: string;
  x: number;
  y: number;
  text: string;
  isCorrect: boolean;
}

/**
 * Alias for the API question-filter params, scoped to the games domain.
 * Using this name instead of `GetQuestionsParams` directly keeps game code
 * readable without re-importing from `@item-bank/api` everywhere.
 */
export type GameQuestionsParams = GetQuestionsParams;

/**
 * A hardcoded demo question used when the API returns zero results.
 * Identical shape to `Question` from `@item-bank/api` except `id` is a
 * string so fallback packs can use readable IDs like `'fallback-q1'`.
 */
export type FallbackQuestion = Omit<Question, 'id'> & { id: string };

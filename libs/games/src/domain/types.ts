/**
 * Shared types for the Games feature.
 *
 * These are game-layer types that wrap the raw `Question` from the API into
 * a shape each game engine can work with directly.
 */

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

/** One answer entity flying across the screen in Answer Runner. */
export interface RunnerAnswer {
  id: string;
  x: number;
  y: number;
  text: string;
  isCorrect: boolean;
}

// Games lib — barrel re-exports
//
// The default export is GamesLobby so that App.tsx can import it concisely:
//   import GamesLobby from '@item-bank/games'
//
// Named exports give access to individual game pages, domain utilities,
// and the shared V2 game building blocks.

export { default } from './pages/GamesLobby';
export { default as GamesLobby } from './pages/GamesLobby';
export { default as QuizArcade } from './pages/quiz-arcade/QuizArcade';
export { default as MemoryMatch } from './pages/memory-match/MemoryMatch';
export { default as AnswerRunner } from './pages/answer-runner/AnswerRunner';
export { default as PixelDash } from './pages/pixel-dash/PixelDash';
export { default as StackAttack } from './pages/stack-attack/StackAttack';

// ── Domain hooks ───────────────────────────────────────────────────────────
export { useGameQuestions, useGameScores, useFallbackQuestions, usePostGameSession } from './domain/hooks';

// ── Shared V2 components ───────────────────────────────────────────────────
export { default as CoinBurst } from './components/CoinBurst';
export { default as StreakFire } from './components/StreakFire';
export { default as LivesBar } from './components/LivesBar';
export { default as ScorePopup } from './components/ScorePopup';

// ── Types ──────────────────────────────────────────────────────────────────
export type {
  GameScreen,
  GameAnswer,
  GameQuestion,
  GameResult,
  MemoryCard,
  RunnerAnswer,
  GameQuestionsParams,
  FallbackQuestion,
} from './domain/types';
export type { FallbackResult } from './domain/UseFallbackQuestions';
export type { CreateGameSessionPayload } from './domain/UsePostGameSession';

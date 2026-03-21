// Games lib — barrel re-exports
//
// The default export is GamesLobby so that App.tsx can import it concisely:
//   import GamesLobby from '@item-bank/games'
//
// Named exports give access to individual game pages and domain utilities.

export { default } from './pages/GamesLobby';
export { default as GamesLobby } from './pages/GamesLobby';
export { default as QuizArcade } from './pages/quiz-arcade/QuizArcade';
export { default as MemoryMatch } from './pages/memory-match/MemoryMatch';
export { default as AnswerRunner } from './pages/answer-runner/AnswerRunner';
export { useGameQuestions } from './domain/hooks';
export type { GameScreen, GameAnswer, GameQuestion, GameResult, MemoryCard, RunnerAnswer } from './domain/types';

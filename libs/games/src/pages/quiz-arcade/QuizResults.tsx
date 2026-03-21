/**
 * QuizResults — shown after all questions are answered.
 *
 * Displays final score, accuracy, and gives the player the option
 * to play again or return to the lobby.
 */

import { Button } from '@item-bank/ui';
import { Trophy } from 'lucide-react';
import type { GameResult } from '../../domain/types';

interface QuizResultsProps {
  result: GameResult;
  onPlayAgain: () => void;
  onBackToLobby: () => void;
}

export default function QuizResults({
  result,
  onPlayAgain,
  onBackToLobby,
}: QuizResultsProps) {
  const accuracy = result.total > 0
    ? Math.round((result.correct / result.total) * 100)
    : 0;

  const emoji =
    accuracy >= 90 ? '🏆' : accuracy >= 70 ? '⭐' : accuracy >= 50 ? '👍' : '💪';

  return (
    <div className="flex flex-col items-center justify-center gap-6 p-10 text-white text-center">
      <Trophy size={48} className="text-yellow-400" />

      <div>
        <p className="text-5xl font-extrabold text-yellow-400 mb-1">
          {result.score}
        </p>
        <p className="text-sm text-white/60 uppercase tracking-widest">Final score</p>
      </div>

      <div className="flex gap-8 text-sm">
        <div>
          <p className="font-bold text-lg">{result.correct}/{result.total}</p>
          <p className="text-white/60">Correct</p>
        </div>
        <div>
          <p className="font-bold text-lg">{accuracy}%</p>
          <p className="text-white/60">Accuracy</p>
        </div>
        <div>
          <p className="font-bold text-lg">{emoji}</p>
          <p className="text-white/60">Rating</p>
        </div>
      </div>

      <div className="flex gap-3 mt-2">
        <Button variant="outline" onClick={onBackToLobby} className="border-white/30 text-white hover:bg-white/10">
          ← Back to Games
        </Button>
        <Button onClick={onPlayAgain}>
          Play Again
        </Button>
      </div>
    </div>
  );
}

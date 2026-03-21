/**
 * QuizResults — shown after all questions are answered.
 *
 * Saves the session to the server on mount via a fire-and-forget mutation.
 * A subtle "✓ Saved" indicator appears on success; errors are silent.
 *
 * Displays final score, accuracy, and gives the player the option
 * to play again or return to the lobby.
 */

import { useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { saveGameSession } from '@item-bank/api';
import { Button } from '@item-bank/ui';
import { Trophy } from 'lucide-react';
import type { GameResult } from '../../domain/types';

interface QuizResultsProps {
  result: GameResult;
  /** Passed through so the saved session is scoped to the right item bank. */
  item_bank_id?: number;
  onPlayAgain: () => void;
  onBackToLobby: () => void;
}

export default function QuizResults({
  result,
  item_bank_id,
  onPlayAgain,
  onBackToLobby,
}: QuizResultsProps) {
  const accuracy = result.total > 0
    ? Math.round((result.correct / result.total) * 100)
    : 0;

  const { mutate, isSuccess } = useMutation({ mutationFn: saveGameSession });

  // Fire once on mount — one component mount = one completed game session.
  useEffect(() => {
    mutate({
      game: 'quiz-arcade',
      score: result.score,
      accuracy,
      total_qs: result.total,
      correct_qs: result.correct,
      item_bank_id,
    });
  }, [mutate]); // eslint-disable-line react-hooks/exhaustive-deps

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

      {/* Subtle save indicator — only shown after the API call succeeds */}
      {isSuccess && (
        <p className="text-xs text-emerald-400">✓ Saved</p>
      )}

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

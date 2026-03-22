/**
 * AnswerRunnerResults — shown after the game ends (all questions done or lives = 0).
 *
 * Saves the session to the server on mount via a fire-and-forget mutation.
 * A subtle "✓ Saved" indicator appears on success; errors are silent.
 *
 * Displays final score, questions answered correctly, and lets the player
 * try again or return to the lobby.
 */

import { useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { saveGameSession } from '@item-bank/api';
import { Button } from '@item-bank/ui';

interface AnswerRunnerResultsProps {
  score: number;
  correctCount: number;
  totalQuestions: number;
  survived: boolean;
  /** Passed through so the saved session is scoped to the right item bank. */
  item_bank_id?: number;
  onPlayAgain: () => void;
  onBack: () => void;
}

export default function AnswerRunnerResults({
  score,
  correctCount,
  totalQuestions,
  survived,
  item_bank_id,
  onPlayAgain,
  onBack,
}: AnswerRunnerResultsProps) {
  const accuracy = totalQuestions > 0
    ? Math.round((correctCount / totalQuestions) * 100)
    : 0;

  const { mutate, isSuccess } = useMutation({ mutationFn: saveGameSession });

  // Fire once on mount — one component mount = one completed game session.
  useEffect(() => {
    mutate({
      game: 'answer-runner',
      score,
      accuracy,
      total_qs: totalQuestions,
      correct_qs: correctCount,
      item_bank_id,
    });
  }, [mutate]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex flex-col items-center justify-center gap-6 p-8 text-center text-white">
      <p className="text-5xl">{survived ? '🏆' : '💀'}</p>

      <p className="text-2xl font-bold">
        {survived ? 'You finished!' : 'Game Over'}
      </p>

      <div className="flex gap-8 text-sm">
        <div>
          <p className="font-bold text-lg text-yellow-400">{score}</p>
          <p className="text-white/60">Score</p>
        </div>
        <div>
          <p className="font-bold text-lg">
            {correctCount}/{totalQuestions}
          </p>
          <p className="text-white/60">Correct</p>
        </div>
        <div>
          <p className="font-bold text-lg">{accuracy}%</p>
          <p className="text-white/60">Accuracy</p>
        </div>
      </div>

      {/* Subtle save indicator — only shown after the API call succeeds */}
      {isSuccess && (
        <p className="text-xs text-emerald-400">✓ Saved</p>
      )}

      <div className="flex gap-3 mt-2">
        <Button
          variant="outline"
          onClick={onBack}
          className="border-white/30 text-white hover:bg-white/10"
        >
          ← Back to Games
        </Button>
        <Button onClick={onPlayAgain}>Play Again</Button>
      </div>
    </div>
  );
}

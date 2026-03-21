/**
 * AnswerRunnerResults — shown after the game ends (all questions done or lives = 0).
 *
 * Displays final score, questions answered correctly, and lets the player
 * try again or return to the lobby.
 */

import { Button } from '@item-bank/ui';

interface AnswerRunnerResultsProps {
  score: number;
  correctCount: number;
  totalQuestions: number;
  survived: boolean;
  onPlayAgain: () => void;
  onBack: () => void;
}

export default function AnswerRunnerResults({
  score,
  correctCount,
  totalQuestions,
  survived,
  onPlayAgain,
  onBack,
}: AnswerRunnerResultsProps) {
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
      </div>

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

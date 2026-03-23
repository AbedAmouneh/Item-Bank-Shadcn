/**
 * StackAttackResults — shown when the player loses all 3 lives.
 *
 * Saves the completed session on mount via a fire-and-forget mutation.
 * Fox line: stack_win for a tall tower (≥8 blocks), stack_topple otherwise.
 *
 * Stats shown: score, tower height, golden blocks, max streak.
 */

import { useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { saveGameSession } from '@item-bank/api';
import { Button } from '@item-bank/ui';
import FoxMascot, { FOX_LINES } from '../../components/FoxMascot';
import { useGameScores } from '../../domain/hooks/UseGameScores';
import ScoreHistory from '../../components/ScoreHistory';

/** Minimum tower height (blocks) to receive the "win" fox line. */
const WIN_HEIGHT_THRESHOLD = 8;

interface StackAttackResultsProps {
  score: number;
  towerHeight: number;
  goldenBlocks: number;
  maxStreak: number;
  wrongCount: number;
  correctCount: number;
  item_bank_id?: number;
  onPlayAgain: () => void;
  onBack: () => void;
}

export default function StackAttackResults({
  score,
  towerHeight,
  goldenBlocks,
  maxStreak,
  wrongCount,
  correctCount,
  item_bank_id,
  onPlayAgain,
  onBack,
}: StackAttackResultsProps) {
  const totalQs = correctCount + wrongCount;
  const accuracy = totalQs > 0 ? Math.round((correctCount / totalQs) * 100) : 0;

  const { scores, save } = useGameScores('stack-attack');
  const { mutate, isSuccess } = useMutation({ mutationFn: saveGameSession });

  // Fire-and-forget on mount — one mount = one completed run.
  useEffect(() => {
    save({ score, correct: correctCount, total: totalQs, accuracy });
    mutate({
      game: 'stack-attack',
      score,
      accuracy,
      total_qs: totalQs,
      correct_qs: correctCount,
      item_bank_id,
    });
  }, [mutate]); // eslint-disable-line react-hooks/exhaustive-deps

  const didWell = towerHeight >= WIN_HEIGHT_THRESHOLD;
  const foxLine = didWell ? FOX_LINES.stack_win : FOX_LINES.stack_topple;

  return (
    <div className="flex flex-col items-center justify-center gap-5 p-6 text-center text-white overflow-y-auto flex-1">
      <p className="text-5xl">{didWell ? '🏗️' : '💥'}</p>

      <p className="text-2xl font-bold">{didWell ? 'Tower Champion!' : 'Tower Toppled!'}</p>

      <FoxMascot line={foxLine} />

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-x-10 gap-y-3 text-sm">
        <div>
          <p className="font-bold text-xl text-yellow-400 tabular-nums">{score}</p>
          <p className="text-white/60">Score</p>
        </div>
        <div>
          <p className="font-bold text-xl tabular-nums">
            {towerHeight} {towerHeight === 1 ? 'block' : 'blocks'}
          </p>
          <p className="text-white/60">Tower height</p>
        </div>
        <div>
          <p className="font-bold text-xl text-yellow-400 tabular-nums">
            {goldenBlocks > 0 ? `${goldenBlocks} 👑` : '—'}
          </p>
          <p className="text-white/60">Golden blocks</p>
        </div>
        <div>
          <p className="font-bold text-xl tabular-nums">
            {maxStreak > 0 ? `${maxStreak} 🔥` : '—'}
          </p>
          <p className="text-white/60">Max streak</p>
        </div>
        <div className="col-span-2">
          <p className="font-bold text-xl tabular-nums">{accuracy}%</p>
          <p className="text-white/60">Accuracy ({correctCount}/{totalQs})</p>
        </div>
      </div>

      {isSuccess && (
        <p className="text-xs text-emerald-400">✓ Saved</p>
      )}

      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={onBack}
          className="border-white/30 text-white hover:bg-white/10"
        >
          ← Back
        </Button>
        <Button onClick={onPlayAgain}>Play Again</Button>
      </div>

      <ScoreHistory scores={scores} />
    </div>
  );
}

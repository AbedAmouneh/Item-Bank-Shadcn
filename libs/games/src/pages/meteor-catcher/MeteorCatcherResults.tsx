/**
 * MeteorCatcherResults — shown when the player loses all lives.
 *
 * Saves the session on mount via usePostGameSession (fire-and-forget).
 * Also persists to localStorage via useGameScores for the score history widget.
 *
 * Fox line: meteor_win for a great score (≥ 5 catches), meteor_lose otherwise.
 */

import { useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { saveGameSession } from '@item-bank/api';
import { Button } from '@item-bank/ui';
import FoxMascot, { FOX_LINES } from '../../components/FoxMascot';
import { useGameScores } from '../../domain/hooks/UseGameScores';
import ScoreHistory from '../../components/ScoreHistory';

/** Minimum correct catches to receive the "win" fox line. */
const WIN_CATCH_THRESHOLD = 5;

interface MeteorCatcherResultsProps {
  score: number;
  catches: number;
  bossesDefeated: number;
  maxStreak: number;
  wrongHits: number;
  item_bank_id?: number;
  onPlayAgain: () => void;
  onBack: () => void;
}

export default function MeteorCatcherResults({
  score,
  catches,
  bossesDefeated,
  maxStreak,
  wrongHits,
  item_bank_id,
  onPlayAgain,
  onBack,
}: MeteorCatcherResultsProps) {
  const totalQs = catches + wrongHits;
  const accuracy = totalQs > 0 ? Math.round((catches / totalQs) * 100) : 0;

  const { scores, save } = useGameScores('meteor-catcher');
  const { mutate, isSuccess } = useMutation({ mutationFn: saveGameSession });

  // Fire-and-forget on mount — one mount equals one completed run.
  useEffect(() => {
    save({ score, correct: catches, total: totalQs, accuracy });
    mutate({
      game: 'meteor-catcher',
      score,
      accuracy,
      total_qs: totalQs,
      correct_qs: catches,
      item_bank_id,
    });
  }, [mutate]); // eslint-disable-line react-hooks/exhaustive-deps

  const didWell = catches >= WIN_CATCH_THRESHOLD;
  const foxLine = didWell ? FOX_LINES.meteor_win : FOX_LINES.meteor_lose;

  return (
    <div className="flex flex-col items-center justify-center gap-5 p-6 text-center text-white overflow-y-auto flex-1">
      <p className="text-5xl">{didWell ? '🌟' : '☄️'}</p>

      <p className="text-2xl font-bold">{didWell ? 'Meteor Ace!' : 'Meteor Storm!'}</p>

      <FoxMascot line={foxLine} />

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-x-10 gap-y-3 text-sm">
        <div>
          <p className="font-bold text-xl text-yellow-400 tabular-nums">{score}</p>
          <p className="text-white/60">Score</p>
        </div>
        <div>
          <p className="font-bold text-xl tabular-nums">{catches} ☄️</p>
          <p className="text-white/60">Catches</p>
        </div>
        <div>
          <p className="font-bold text-xl text-red-400 tabular-nums">
            {bossesDefeated > 0 ? `${bossesDefeated} 💥` : '—'}
          </p>
          <p className="text-white/60">Bosses defeated</p>
        </div>
        <div>
          <p className="font-bold text-xl tabular-nums">
            {maxStreak > 0 ? `${maxStreak} 🔥` : '—'}
          </p>
          <p className="text-white/60">Max streak</p>
        </div>
        <div className="col-span-2">
          <p className="font-bold text-xl tabular-nums">{accuracy}%</p>
          <p className="text-white/60">Accuracy ({catches}/{totalQs})</p>
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

/**
 * PixelDashResults — shown when lives reach 0.
 *
 * Saves the completed session to the server on mount via a fire-and-forget
 * mutation (same pattern as AnswerRunnerResults). A "✓ Saved" indicator appears
 * on success; errors are silently ignored so the results screen is never blocked.
 *
 * Stats shown: score, gates cleared, coins collected, max streak, distance.
 * Fox mascot line: win if gatesCleared >= 5, lose otherwise.
 */

import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation } from '@tanstack/react-query';
import { saveGameSession } from '@item-bank/api';
import { Button } from '@item-bank/ui';
import FoxMascot, { FOX_LINES } from '../../components/FoxMascot';
import { useGameScores } from '../../domain/hooks/UseGameScores';
import ScoreHistory from '../../components/ScoreHistory';

interface PixelDashResultsProps {
  score: number;
  gatesCleared: number;
  coinsCollected: number;
  maxStreak: number;
  distancePx: number;
  totalGatesReached: number;
  item_bank_id?: number;
  onPlayAgain: () => void;
  onBack: () => void;
}

export default function PixelDashResults({
  score,
  gatesCleared,
  coinsCollected,
  maxStreak,
  distancePx,
  totalGatesReached,
  item_bank_id,
  onPlayAgain,
  onBack,
}: PixelDashResultsProps) {
  const { t } = useTranslation('common');
  const accuracy = totalGatesReached > 0
    ? Math.round((gatesCleared / totalGatesReached) * 100)
    : 0;
  const distanceM = Math.round(distancePx / 100);

  const { scores, save } = useGameScores('pixel-dash');
  const { mutate, isSuccess } = useMutation({ mutationFn: saveGameSession });

  // hasSavedRef prevents a second save if React re-runs this effect (e.g. Strict Mode double-invoke).
  const hasSavedRef = useRef(false);

  // Fire-and-forget on mount — one mount = one completed run.
  useEffect(() => {
    if (hasSavedRef.current) return;
    hasSavedRef.current = true;
    save({ score, correct: gatesCleared, total: totalGatesReached, accuracy });
    mutate({
      game: 'pixel-dash',
      score,
      accuracy,
      total_qs: totalGatesReached,
      correct_qs: gatesCleared,
      item_bank_id,
    });
  }, [save, mutate, score, gatesCleared, totalGatesReached, accuracy, item_bank_id]);

  const didWell = gatesCleared >= 5;
  const foxLine = didWell ? FOX_LINES.pixel_dash_win : FOX_LINES.pixel_dash_lose;

  return (
    <div className="flex flex-col items-center justify-center gap-5 p-6 text-center text-white overflow-y-auto flex-1 bg-[#1a3a0a]">
      <p className="text-5xl">{didWell ? '🏆' : '💀'}</p>

      <p className="text-2xl font-bold">{didWell ? 'Great run!' : 'Game Over'}</p>

      <FoxMascot line={foxLine} />

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-x-10 gap-y-3 text-sm">
        <div>
          <p className="font-bold text-xl text-yellow-400 tabular-nums">{score}</p>
          <p className="text-white/60">{t('games.score_stat')}</p>
        </div>
        <div>
          <p className="font-bold text-xl tabular-nums">{gatesCleared}</p>
          <p className="text-white/60">{t('games.gates_cleared_stat')}</p>
        </div>
        <div>
          <p className="font-bold text-xl text-yellow-400 tabular-nums">{coinsCollected}</p>
          <p className="text-white/60">{t('games.coins_stat')}</p>
        </div>
        <div>
          <p className="font-bold text-xl tabular-nums">
            {maxStreak > 0 ? `${maxStreak} 🔥` : '0'}
          </p>
          <p className="text-white/60">{t('games.max_streak_stat')}</p>
        </div>
        <div className="col-span-2">
          <p className="font-bold text-xl tabular-nums">{distanceM} m</p>
          <p className="text-white/60">{t('games.distance_stat')}</p>
        </div>
      </div>

      {isSuccess && (
        <p className="text-xs text-emerald-400">{t('games.saved')}</p>
      )}

      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={onBack}
          className="border-white/30 text-white hover:bg-white/10"
        >
          {t('games.back')}
        </Button>
        <Button onClick={onPlayAgain} className="bg-amber-600 hover:bg-amber-500 text-white border-0 shadow-lg shadow-amber-900/50">{t('games.play_again')}</Button>
      </div>

      <ScoreHistory scores={scores} />
    </div>
  );
}

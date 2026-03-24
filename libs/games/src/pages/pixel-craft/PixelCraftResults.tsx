import { useEffect } from 'react';
import { Button } from '@item-bank/ui';
import { usePostGameSession } from '../../domain/hooks';
import type { PixelCraftSummary } from './hooks/usePixelCraftLogic';

interface PixelCraftResultsProps {
  summary: PixelCraftSummary;
  item_bank_id?: number;
  onPlayAgain: () => void;
  onBack: () => void;
}

/**
 * Pixel Craft results panel.
 */
export default function PixelCraftResults({
  summary,
  item_bank_id,
  onPlayAgain,
  onBack,
}: PixelCraftResultsProps) {
  const perfectRate =
    summary.craftsCompleted > 0
      ? Math.round((summary.perfectCrafts / summary.craftsCompleted) * 100)
      : 0;

  const { save, saving, saved, error } = usePostGameSession();

  useEffect(() => {
    void save({
      game: 'pixel-craft',
      score: summary.score,
      accuracy: perfectRate,
      total_qs: summary.craftsCompleted,
      correct_qs: summary.perfectCrafts,
      item_bank_id,
      extra_data: {
        crafts_completed: summary.craftsCompleted,
        perfect_crafts: summary.perfectCrafts,
        avg_time_sec: summary.avgTimeSec,
        wrong_placements: summary.wrongPlacements,
      },
    });
  }, [
    item_bank_id,
    perfectRate,
    save,
    summary.avgTimeSec,
    summary.craftsCompleted,
    summary.perfectCrafts,
    summary.score,
    summary.wrongPlacements,
  ]);

  return (
    <div
      className="flex flex-col items-center gap-5 rounded-lg border-2 p-6 text-center"
      style={{
        backgroundColor: '#0f172a',
        borderColor: '#334155',
      }}
    >
      <div className="text-5xl" aria-hidden="true">
        🧩
      </div>

      <div>
        <p className="text-2xl font-black text-white">Workshop Complete</p>
        <p className="mt-1 text-sm text-slate-400">
          You finished {summary.craftsCompleted} craft
          {summary.craftsCompleted === 1 ? '' : 's'}.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
        <div className="rounded-md bg-slate-800/80 px-4 py-3">
          <p className="text-xl font-black text-yellow-300">{summary.score}</p>
          <p className="text-slate-400">Score</p>
        </div>
        <div className="rounded-md bg-slate-800/80 px-4 py-3">
          <p className="text-xl font-black text-white">
            {summary.perfectCrafts}
          </p>
          <p className="text-slate-400">Perfect crafts</p>
        </div>
        <div className="rounded-md bg-slate-800/80 px-4 py-3">
          <p className="text-xl font-black text-white">{summary.avgTimeSec}s</p>
          <p className="text-slate-400">Average time</p>
        </div>
        <div className="rounded-md bg-slate-800/80 px-4 py-3">
          <p className="text-xl font-black text-white">
            {summary.wrongPlacements}
          </p>
          <p className="text-slate-400">Wrong drops</p>
        </div>
      </div>

      <div className="rounded-md bg-slate-900/70 px-4 py-3 text-sm text-slate-300">
        Perfect craft rate:{' '}
        <span className="font-bold text-white">{perfectRate}%</span>
      </div>

      {saving && (
        <p className="text-xs text-slate-400">Saving workshop stats...</p>
      )}
      {saved && <p className="text-xs text-emerald-400">Saved</p>}
      {error && <p className="text-xs text-amber-300">{error}</p>}

      <div className="flex flex-wrap justify-center gap-3">
        <Button
          variant="outline"
          onClick={onBack}
          className="border-slate-500 text-white hover:bg-slate-800"
        >
          Back to Games
        </Button>
        <Button
          onClick={onPlayAgain}
          className="bg-blue-600 text-white hover:bg-blue-500"
        >
          Play Again
        </Button>
      </div>
    </div>
  );
}

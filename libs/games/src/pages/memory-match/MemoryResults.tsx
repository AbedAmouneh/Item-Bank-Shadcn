/**
 * MemoryResults — shown after all pairs are matched.
 *
 * Saves the session to the server on mount via a fire-and-forget mutation.
 * A subtle "✓ Saved" indicator appears on success; errors are silent.
 *
 * Displays pairs matched, total moves, and an efficiency score
 * (how close to the theoretical minimum of totalPairs moves the player got).
 * Offers Play Again and Back to Games actions.
 */

import { useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { saveGameSession } from '@item-bank/api';
import { Button } from '@item-bank/ui';

interface MemoryResultsProps {
  matchCount: number;
  totalPairs: number;
  moves: number;
  /** Passed through so the saved session is scoped to the right item bank. */
  item_bank_id?: number;
  onPlayAgain: () => void;
  onBack: () => void;
}

export default function MemoryResults({
  matchCount,
  totalPairs,
  moves,
  item_bank_id,
  onPlayAgain,
  onBack,
}: MemoryResultsProps) {
  // Perfect game = totalPairs moves (one lucky flip per pair). Efficiency caps at 100%.
  const efficiency = moves > 0 ? Math.min(100, Math.round((totalPairs / moves) * 100)) : 100;
  const allMatched = matchCount >= totalPairs;
  // Score: 10 pts per matched pair, as defined in the game spec.
  const score = matchCount * 10;

  const { mutate, isSuccess } = useMutation({ mutationFn: saveGameSession });

  // Fire once on mount — one component mount = one completed game session.
  useEffect(() => {
    mutate({
      game: 'memory-match',
      score,
      accuracy: efficiency,
      total_qs: totalPairs,
      correct_qs: matchCount,
      item_bank_id,
    });
  }, [mutate]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex flex-col items-center justify-center gap-6 p-8 text-center text-white">
      <p className="text-5xl">{allMatched ? '🏆' : '🃏'}</p>

      <p className="text-2xl font-bold">
        {allMatched ? 'All pairs matched!' : `${matchCount} / ${totalPairs} pairs matched`}
      </p>

      <div className="flex gap-8 text-sm">
        <div>
          <p className="font-bold text-lg">{matchCount}/{totalPairs}</p>
          <p className="text-white/60">Pairs</p>
        </div>
        <div>
          <p className="font-bold text-lg">{moves}</p>
          <p className="text-white/60">Moves</p>
        </div>
        <div>
          <p className="font-bold text-lg">{efficiency}%</p>
          <p className="text-white/60">Efficiency</p>
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

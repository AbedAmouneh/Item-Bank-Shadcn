/**
 * MemoryResults — shown after all pairs are matched.
 *
 * Displays pairs matched, total moves, and an efficiency score
 * (how close to the theoretical minimum of totalPairs moves the player got).
 * Offers Play Again and Back to Games actions.
 */

import { Button } from '@item-bank/ui';

interface MemoryResultsProps {
  matchCount: number;
  totalPairs: number;
  moves: number;
  onPlayAgain: () => void;
  onBack: () => void;
}

export default function MemoryResults({
  matchCount,
  totalPairs,
  moves,
  onPlayAgain,
  onBack,
}: MemoryResultsProps) {
  // Perfect game = totalPairs moves (one lucky flip per pair). Efficiency caps at 100%.
  const efficiency = moves > 0 ? Math.min(100, Math.round((totalPairs / moves) * 100)) : 100;
  const allMatched = matchCount >= totalPairs;

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

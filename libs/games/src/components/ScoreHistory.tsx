/**
 * ScoreHistory — compact list of recent game results.
 *
 * Designed for the dark-background results screens used by all three games.
 * Shows up to 5 past entries: date, correct/total, accuracy, and score.
 *
 * Renders nothing when the scores array is empty (first-ever play).
 */

import type { GameScoreEntry } from '../domain/types';

interface ScoreHistoryProps {
  scores: GameScoreEntry[];
}

/** Format an ISO timestamp as a short locale string, e.g. "Mar 23, 14:05". */
function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export default function ScoreHistory({ scores }: ScoreHistoryProps) {
  if (scores.length === 0) return null;

  return (
    <div className="w-full mt-2">
      <p className="text-white/40 text-[10px] font-semibold uppercase tracking-widest mb-2 text-center">
        Recent Scores
      </p>
      <div className="flex flex-col gap-1">
        {scores.map((entry, i) => (
          <div
            key={i}
            className="flex items-center justify-between rounded-lg px-3 py-1.5 bg-white/5 text-xs"
          >
            <span className="text-white/50 tabular-nums">{formatDate(entry.date)}</span>
            <span className="text-white/80 font-medium tabular-nums">
              {entry.correct}/{entry.total}
            </span>
            <span className="text-white/60 tabular-nums">{entry.accuracy}%</span>
            <span className="text-yellow-400 font-bold tabular-nums">{entry.score} pts</span>
          </div>
        ))}
      </div>
    </div>
  );
}

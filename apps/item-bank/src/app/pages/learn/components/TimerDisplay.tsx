import { Clock } from 'lucide-react';

import { cn } from '@item-bank/ui';

interface TimerDisplayProps {
  /** Seconds remaining. Pass -1 to hide the timer (no time limit). */
  secondsLeft: number;
  /** When true, renders in red as a warning. */
  isWarning: boolean;
}

/**
 * Displays remaining exam time as MM:SS.
 * Returns null when secondsLeft is -1 (no time limit configured).
 */
export function TimerDisplay({ secondsLeft, isWarning }: TimerDisplayProps) {
  if (secondsLeft === -1) return null;

  const displaySeconds = Math.max(0, secondsLeft);
  const minutes = Math.floor(displaySeconds / 60);
  const seconds = displaySeconds % 60;
  const formatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  return (
    <div
      className={cn(
        'flex items-center gap-1.5 font-mono text-sm font-semibold tabular-nums',
        isWarning ? 'text-destructive' : 'text-foreground',
      )}
      aria-label={`Time remaining: ${formatted}`}
      aria-live="off"
    >
      <Clock size={14} className={isWarning ? 'text-destructive' : 'text-muted-foreground'} />
      {formatted}
    </div>
  );
}

import { useState, useEffect, useRef } from 'react';

interface UseExamTimerOptions {
  /** ISO-8601 deadline string from the server. Null = no time limit. */
  deadlineAt: string | null;
  /** Called once when the timer reaches zero. */
  onExpire: () => void;
}

interface UseExamTimerReturn {
  /** Seconds remaining. -1 when there is no time limit. */
  secondsLeft: number;
  /** True when secondsLeft > 0 and secondsLeft < 300 (5 minutes). */
  isWarning: boolean;
  /** True when the timer has reached zero. */
  isExpired: boolean;
}

/**
 * Counts down from the server-provided deadline to zero.
 *
 * The timer is driven entirely by the client clock — the server's deadline_at
 * is the ground truth, but we never sync back to it mid-exam. If the
 * user's clock drifts, the server will still reject a late submission.
 */
export function useExamTimer({
  deadlineAt,
  onExpire,
}: UseExamTimerOptions): UseExamTimerReturn {
  const computeSecondsLeft = (): number => {
    if (!deadlineAt) return -1;
    return Math.max(0, Math.floor((new Date(deadlineAt).getTime() - Date.now()) / 1000));
  };

  const [secondsLeft, setSecondsLeft] = useState<number>(computeSecondsLeft);
  // Store callback in a ref so the effect closure never goes stale.
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  useEffect(() => {
    if (!deadlineAt) return;

    const tick = () => {
      const remaining = computeSecondsLeft();
      setSecondsLeft(remaining);

      if (remaining <= 0) {
        onExpireRef.current();
      }
    };

    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deadlineAt]);

  const isExpired = deadlineAt !== null && secondsLeft <= 0;
  const isWarning = !isExpired && secondsLeft !== -1 && secondsLeft < 300;

  return { secondsLeft, isWarning, isExpired };
}

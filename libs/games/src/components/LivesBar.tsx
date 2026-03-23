/**
 * LivesBar — row of heart icons tracking remaining lives.
 *
 * Intact lives show ❤️; lost lives show 🖤. When `lives` drops, the newly-
 * lost heart gets a new `key` which forces React to remount it, triggering
 * the heart-shake CSS animation before it settles as a dark heart.
 *
 * Usage:
 *   <LivesBar lives={lives} maxLives={3} />
 */

import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';

interface LivesBarProps {
  /** Current lives remaining. Must be ≥ 0 and ≤ maxLives. */
  lives: number;
  /** Total lives at the start of the game. Determines how many icons render. */
  maxLives: number;
}

export default function LivesBar({ lives, maxLives }: LivesBarProps) {
  const prevLivesRef = useRef(lives);
  const [shakeKey, setShakeKey] = useState(0);

  useEffect(() => {
    if (lives < prevLivesRef.current) {
      // A life was just lost — bump shakeKey so the newly-lost heart remounts
      // and the heart-shake animation fires from the beginning.
      setShakeKey((k) => k + 1);
    }
    prevLivesRef.current = lives;
  }, [lives]);

  return (
    <div
      className="flex items-center gap-1"
      role="img"
      aria-label={`${lives} of ${maxLives} lives remaining`}
    >
      {Array.from({ length: maxLives }, (_, i) => {
        const isLost = i >= lives;
        // Index `lives` (0-based) is the heart that was just lost this tick.
        const isNewlyLost = i === lives;

        return (
          <span
            key={isNewlyLost ? shakeKey : i}
            className={`text-lg select-none${isLost ? ' opacity-40' : ''}`}
            style={
              isNewlyLost && shakeKey > 0
                ? ({ animation: 'heart-shake 400ms ease-in-out' } as CSSProperties)
                : undefined
            }
          >
            {isLost ? '🖤' : '❤️'}
          </span>
        );
      })}
    </div>
  );
}

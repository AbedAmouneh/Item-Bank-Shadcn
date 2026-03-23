/**
 * CoinBurst — 8 gold pixel coins that fly outward from a centre point.
 *
 * Absolute-positioned at (x, y). After 700 ms calls onDone so the parent
 * can unmount it. The 100 ms gap after the 600 ms animation ensures coins
 * have fully disappeared before the element is removed.
 *
 * Each coin's direction is a CSS custom property so one `coin-fly` keyframe
 * drives all 8 without duplicating animation definitions.
 *
 * Usage:
 *   {showBurst && <CoinBurst x={64} y={120} onDone={() => setShowBurst(false)} />}
 */

import { useEffect } from 'react';
import type { CSSProperties } from 'react';

interface CoinBurstProps {
  /** Pixel offset from the nearest positioned ancestor — inline-start axis. */
  x: number;
  /** Pixel offset from the nearest positioned ancestor — block-start axis. */
  y: number;
  /** Called after 700 ms so the parent can unmount this component. */
  onDone: () => void;
}

/** Pre-defined compass directions (N, NE, E, SE, S, SW, W, NW) at ~60 px. */
const DIRECTIONS: ReadonlyArray<{ dx: number; dy: number }> = [
  { dx: 0,   dy: -60 }, // N
  { dx: 42,  dy: -42 }, // NE
  { dx: 60,  dy: 0   }, // E
  { dx: 42,  dy: 42  }, // SE
  { dx: 0,   dy: 60  }, // S
  { dx: -42, dy: 42  }, // SW
  { dx: -60, dy: 0   }, // W
  { dx: -42, dy: -42 }, // NW
];

export default function CoinBurst({ x, y, onDone }: CoinBurstProps) {
  useEffect(() => {
    const timer = setTimeout(onDone, 700);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <div
      className="absolute pointer-events-none"
      style={{ insetInlineStart: x, insetBlockStart: y }}
    >
      {DIRECTIONS.map(({ dx, dy }, i) => (
        <div
          key={i}
          className="absolute w-2 h-2 bg-yellow-400 rounded-full"
          style={
            {
              '--coin-dx': `${dx}px`,
              '--coin-dy': `${dy}px`,
              animation: 'coin-fly 600ms ease-out forwards',
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}

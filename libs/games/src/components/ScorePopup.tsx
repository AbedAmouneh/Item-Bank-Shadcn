/**
 * ScorePopup — floating "+N ✨" label that fades upward after a correct answer.
 *
 * Absolute-positioned at (x, y) relative to the nearest positioned ancestor.
 * pointer-events-none so it never blocks interaction. Calls onDone after
 * 850 ms so the parent can unmount it once the animation completes.
 *
 * Usage:
 *   {popup && (
 *     <ScorePopup
 *       value={50}
 *       x={popup.x}
 *       y={popup.y}
 *       onDone={() => setPopup(null)}
 *     />
 *   )}
 */

import { useEffect } from 'react';
import type { CSSProperties } from 'react';

interface ScorePopupProps {
  /** Points to display (rendered as "+N"). */
  value: number;
  /** Optional suffix shown after the value. Defaults to '✨'. */
  label?: string;
  /** Inline-start offset from nearest positioned ancestor. */
  x: number;
  /** Block-start offset from nearest positioned ancestor. */
  y: number;
  /** Called after 850 ms so the parent can unmount this component. */
  onDone: () => void;
}

export default function ScorePopup({ value, label = '✨', x, y, onDone }: ScorePopupProps) {
  useEffect(() => {
    const timer = setTimeout(onDone, 850);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="absolute pointer-events-none select-none font-bold text-yellow-300 text-sm whitespace-nowrap"
      style={
        {
          insetInlineStart: x,
          insetBlockStart: y,
          animation: 'score-float 850ms ease-out forwards',
        } as CSSProperties
      }
    >
      +{value} {label}
    </div>
  );
}

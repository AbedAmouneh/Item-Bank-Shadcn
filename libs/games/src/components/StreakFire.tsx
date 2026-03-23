/**
 * StreakFire — multiplier badge shown during an active answer streak.
 *
 * Renders null when not visible so it leaves no DOM footprint between
 * appearances. Re-mounts each time `visible` flips to true, re-triggering
 * the fox-appear entrance animation.
 *
 * Multiplier table:
 *   streak ≥  3 → ×2
 *   streak ≥  6 → ×3
 *   streak ≥ 10 → ×4
 *
 * Usage:
 *   <StreakFire streak={streak} visible={streak >= 3} />
 */

interface StreakFireProps {
  /** Current streak count — used to derive the multiplier label. */
  streak: number;
  /** When false the component is completely removed from the DOM. */
  visible: boolean;
}

/** Returns the score multiplier for the given streak count. */
function getMultiplier(streak: number): number {
  if (streak >= 10) return 4;
  if (streak >= 6) return 3;
  return 2;
}

export default function StreakFire({ streak, visible }: StreakFireProps) {
  if (!visible) return null;

  const multiplier = getMultiplier(streak);

  return (
    <div
      role="img"
      aria-label={`Streak active: ×${multiplier} score multiplier`}
      className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-orange-500/20 border border-orange-400/40 text-sm font-bold text-orange-300 select-none [animation:fox-appear_0.35s_ease-out]"
    >
      <span aria-hidden="true">🔥 ×{multiplier}</span>
    </div>
  );
}

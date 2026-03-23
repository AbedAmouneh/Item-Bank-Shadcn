/**
 * FoxMascot — the adventurer fox guide character.
 *
 * Renders a speech bubble beside the fox avatar. Whenever `line` changes the
 * bubble re-mounts (key trick) which re-triggers the entrance animation, so
 * every new line feels like the fox is actively speaking.
 *
 * Usage:
 *   <FoxMascot line="Ready, explorer? Let's go! 🗺️" />
 */

import type { CSSProperties } from 'react';

// ─── Line collections ──────────────────────────────────────────────────────

export const FOX_LINES = {
  // ── Answer Runner ────────────────────────────────────────────────────────
  runner_idle:
    "Ready, explorer? I'll read the questions — you chase the right answers! 🗺️",
  runner_playing:
    'Keep moving! Steer into the right tile and dodge the wrong ones.',
  runner_correct: [
    'Sharp thinking! ✨',
    'Right on target! 🌟',
    'Excellent, explorer!',
    'You knew that one!',
    'Wisdom in action! ✨',
  ],
  runner_wrong: [
    'Not quite — keep going! 🦊',
    'Tricky one, stay sharp!',
    'Every explorer stumbles sometimes.',
    "Don't stop now, explorer!",
  ],
  runner_win:
    'Outstanding! You navigated every question. A true explorer! 🌟',
  runner_lose:
    'A brave run! Every journey teaches something new. 🦊',

  // ── Memory Match ─────────────────────────────────────────────────────────
  memory_idle:
    "Your memory is your compass, explorer. Let's see how sharp it is! 🗺️",
  memory_playing:
    'Flip the cards and find the matching pairs. Trust your memory.',
  memory_match: [
    'Memory sharp as ever! ✨',
    'A match! Your mind is like a map. 🗺️',
    'Excellent recall, explorer!',
    'Your memory is extraordinary! 🌟',
  ],
  memory_mismatch: [
    'Not quite — but you know where it is now. 🦊',
    'Almost! Keep those positions in mind.',
    'Good try — remember what you saw.',
    'Stay patient, explorer.',
  ],
  memory_win:
    'Incredible! You matched every pair with a sharp mind. 🌟',
  memory_few_moves:
    'Brilliant efficiency, explorer! Wisdom AND memory — impressive! ✨',

  // ── Quiz Arcade ──────────────────────────────────────────────────────────
  quiz_idle:
    'Ready for rapid-fire questions, explorer? Answer swiftly and wisely! ⏱️',
  quiz_countdown:
    'Get ready, explorer… your knowledge is your greatest weapon! 🗺️',
  quiz_thinking: [
    'Think carefully, explorer. 🗺️',
    "You've got this!",
    'Trust your knowledge.',
    'Take a breath — you know this.',
  ],
  quiz_correct: [
    'Brilliant! ✨',
    'Speed and wisdom — a rare gift! 🌟',
    'Sharp mind, explorer!',
    'Right! Your knowledge is vast.',
    'Outstanding! ✨',
  ],
  quiz_wrong: [
    "Not this time — but you're learning! 🦊",
    'Hmm, tricky one. Keep going!',
    'Every miss makes you wiser.',
    "Don't give up, explorer! 🗺️",
  ],
  quiz_win:
    'Outstanding speed and knowledge, explorer! Truly impressive. 🌟',
  quiz_ok:
    'A solid quiz! Wisdom grows with every attempt. 🦊',
  quiz_low:
    'Keep exploring — every question is a new adventure! 🗺️',

  // ── Pixel Dash ───────────────────────────────────────────────────────────
  pixel_dash_idle:
    "Three lanes, endless adventure. Ready to dash, explorer? 🐇",
  pixel_dash_playing:
    'Keep moving! Dodge the obstacles and collect those coins!',
  pixel_dash_gate_correct: [
    'Correct! Well answered, explorer! ✨',
    'Right lane, right answer! 🌟',
    'Knowledge speeds you up! ✨',
    'Sharp! Keep that streak going!',
  ],
  pixel_dash_gate_wrong: [
    'Wrong lane — stay sharp, explorer! 🦊',
    'Not quite — you still have lives left!',
    'Tricky gate! Keep dashing!',
    "Don't stop now, explorer! 🗺️",
  ],
  pixel_dash_win:
    'Incredible run, explorer! Knowledge and speed combined! 🌟',
  pixel_dash_lose:
    'Every dash teaches something new. Come back stronger! 🦊',

  // ── Stack Attack ──────────────────────────────────────────────────────────
  stack_idle:
    'Every great tower starts with one block. Ready to build, explorer? 🏗️',
  stack_playing:
    'Watch the swing — and time your answer! A steady hand wins.',
  stack_correct: [
    'A solid block! Keep building! 🏗️',
    'Well placed, explorer! ✨',
    'Your tower grows taller! 🌟',
    'Precise and correct — excellent!',
    'Knowledge stacks up! ✨',
  ],
  stack_wrong: [
    'The block slipped — stay focused! 🦊',
    'Wrong answer! You still have lives left.',
    'Steady, explorer — keep building!',
    "Don't let the tower topple! 🗺️",
  ],
  stack_win:
    'Magnificent! Your tower reaches the sky — a true master builder! 🌟',
  stack_topple:
    'Every tower teaches balance. Come back and build higher! 🦊',
} as const;

/** Return a random line from an array. */
export function pickLine(arr: readonly string[]): string {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ─── Component ────────────────────────────────────────────────────────────

interface FoxMascotProps {
  /** The line the fox is currently saying. Changing this re-triggers the animation. */
  line: string;
  className?: string;
}

const tailStyle: CSSProperties = {
  position: 'absolute',
  insetInlineStart: -8,
  top: 12,
  width: 0,
  height: 0,
  borderTop: '6px solid transparent',
  borderBottom: '6px solid transparent',
  borderInlineEnd: '8px solid rgba(255,255,255,0.15)',
};

export default function FoxMascot({ line, className = '' }: FoxMascotProps) {
  return (
    <div className={`flex items-start gap-3 ${className}`}>
      {/* Fox avatar — warm orange ring so it reads as the same character every time */}
      <div className="shrink-0 w-11 h-11 rounded-full bg-orange-500/20 border-2 border-orange-400/50 flex items-center justify-center text-xl select-none shadow-md">
        🦊
      </div>

      {/* Speech bubble — key on `line` re-mounts the div, re-triggering the animation */}
      <div
        key={line}
        className="relative mt-1 bg-white/10 border border-white/20 rounded-2xl rounded-tl-none px-4 py-2.5 text-sm text-white font-medium leading-snug max-w-[260px] [animation:fox-appear_0.35s_ease-out]"
      >
        <span style={tailStyle} />
        {line}
      </div>
    </div>
  );
}

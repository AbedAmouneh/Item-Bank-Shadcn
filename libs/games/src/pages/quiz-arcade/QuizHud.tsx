/**
 * QuizHud — top overlay strip showing score, question progress, and time.
 *
 * Rendered as HTML above the Cubeforge canvas so it's always readable
 * regardless of what's happening on the game canvas.
 */

import { Star, Timer, Hash } from 'lucide-react';

interface QuizHudProps {
  score: number;
  questionIndex: number;
  total: number;
  timeLeft: number;
  streak: number;
}

export default function QuizHud({
  score,
  questionIndex,
  total,
  timeLeft,
  streak,
}: QuizHudProps) {
  return (
    <div className="flex items-center justify-between w-full px-4 py-2 bg-black/40 backdrop-blur-sm rounded-t-xl text-white text-sm font-medium">
      {/* Score */}
      <div className="flex items-center gap-1.5">
        <Star size={14} className="text-yellow-400" />
        <span>{score}</span>
        {streak >= 3 && (
          <span className="ms-1 text-xs text-orange-400 font-bold animate-pulse">
            🔥 ×2
          </span>
        )}
      </div>

      {/* Question counter */}
      <div className="flex items-center gap-1.5">
        <Hash size={14} className="text-blue-400" />
        <span>
          {questionIndex + 1} / {total}
        </span>
      </div>

      {/* Timer */}
      <div className="flex items-center gap-1.5">
        <Timer size={14} className={timeLeft <= 5 ? 'text-red-400 animate-pulse' : 'text-green-400'} />
        <span className={timeLeft <= 5 ? 'text-red-400' : ''}>{timeLeft}s</span>
      </div>
    </div>
  );
}

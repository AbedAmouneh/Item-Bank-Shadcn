/**
 * QuizAnswerGrid — renders the clickable answer buttons.
 *
 * Uses standard HTML buttons (not canvas) so accessibility, focus rings,
 * keyboard navigation, and Arabic RTL all work out of the box.
 *
 * After a selection is made, buttons are disabled and coloured green/red
 * to reveal correctness while the parent transitions to `answer_reveal`.
 *
 * `firstButtonRef` is forwarded to button A so QuizArcade can focus it
 * programmatically each time a new question appears.
 */

import type { RefObject } from 'react';
import { cn } from '@item-bank/ui';
import type { GameAnswer } from '../../domain/types';

interface QuizAnswerGridProps {
  answers: GameAnswer[];
  /** ID of the answer the player just selected, or null if not yet chosen. */
  selected: string | null;
  onSelect: (id: string) => void;
  /** True during answer_reveal phase — all buttons disabled. */
  disabled: boolean;
  /** Attached to button A so the parent can focus it when a new question mounts. */
  firstButtonRef?: RefObject<HTMLButtonElement>;
}

const LABELS = ['A', 'B', 'C', 'D'];

export default function QuizAnswerGrid({
  answers,
  selected,
  onSelect,
  disabled,
  firstButtonRef,
}: QuizAnswerGridProps) {
  return (
    <div className="grid grid-cols-2 gap-3 w-full px-6 pb-6">
      {answers.slice(0, 4).map((answer, index) => {
        const isSelected = selected === answer.id;
        const isRevealing = disabled && selected !== null;

        const colorClass = isRevealing
          ? answer.isCorrect
            ? 'bg-green-600 border-green-400 text-white'
            : isSelected
            ? 'bg-red-600 border-red-400 text-white'
            : 'bg-white/5 border-white/20 text-white/40'
          : isSelected
          ? 'bg-primary border-primary text-white'
          : 'bg-white/10 border-white/20 text-white hover:bg-white/20';

        return (
          <button
            key={answer.id}
            ref={index === 0 ? firstButtonRef : undefined}
            disabled={disabled}
            onClick={() => onSelect(answer.id)}
            className={cn(
              'flex items-center gap-3 p-3 rounded-xl border text-start',
              'transition-colors duration-200 cursor-pointer disabled:cursor-default',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60',
              colorClass,
            )}
            aria-label={`Answer ${LABELS[index]}: ${answer.text}`}
          >
            <span className="shrink-0 w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">
              {LABELS[index]}
            </span>
            <span className="text-sm font-medium">{answer.text}</span>
          </button>
        );
      })}
    </div>
  );
}

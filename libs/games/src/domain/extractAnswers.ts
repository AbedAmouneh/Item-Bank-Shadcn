/**
 * Answer extraction utilities.
 *
 * Each question type stores its answers in a different shape inside `content`.
 * These helpers normalise them into a uniform `GameAnswer[]` the games can render.
 */

import type { Question } from '@item-bank/api';
import type { GameAnswer } from './types';

// ─── Internal content shapes ────────────────────────────────────────────────
// These extend Record<string, unknown> so TypeScript accepts the direct cast
// from Question.content (which is typed as Record<string, unknown>).

interface MCChoice {
  id: string;
  text: string;
  isCorrect: boolean;
}

interface MCContent extends Record<string, unknown> {
  choices: MCChoice[];
}

interface TrueFalseContent extends Record<string, unknown> {
  correctAnswer: 'true' | 'false';
}

interface NumericalContent extends Record<string, unknown> {
  correctAnswer: number;
  tolerance?: number;
}

// ─── Numerical helpers ───────────────────────────────────────────────────────

/**
 * Generate four answer options for a numerical question:
 * one correct value plus three plausible distractors.
 */
function generateNumericalOptions(
  correct: number,
  tolerance: number,
): GameAnswer[] {
  const step = tolerance > 0 ? tolerance * 2 : Math.abs(correct) * 0.15 || 1;
  const offsets = [-3, -1, 2]; // relative steps for wrong answers
  const wrongs = offsets.map((o) =>
    parseFloat((correct + o * step).toFixed(4)),
  );

  const all = [
    { id: 'correct', text: String(correct), isCorrect: true },
    ...wrongs.map((v, i) => ({
      id: `wrong-${i}`,
      text: String(v),
      isCorrect: false,
    })),
  ];

  // Shuffle so the correct answer isn't always first.
  return all.sort(() => Math.random() - 0.5);
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Parse a raw API `Question` into a flat list of `GameAnswer` objects.
 * Returns an empty array for question types that cannot be displayed as choices.
 */
export function extractAnswers(q: Question): GameAnswer[] {
  switch (q.type) {
    case 'multiple_choice': {
      const content = q.content as MCContent;
      return content.choices.map((c) => ({
        id: c.id,
        text: c.text,
        isCorrect: c.isCorrect,
      }));
    }

    case 'true_false': {
      const content = q.content as TrueFalseContent;
      return [
        { id: 'true', text: 'True', isCorrect: content.correctAnswer === 'true' },
        { id: 'false', text: 'False', isCorrect: content.correctAnswer === 'false' },
      ];
    }

    case 'numerical': {
      const content = q.content as NumericalContent;
      return generateNumericalOptions(
        content.correctAnswer,
        content.tolerance ?? 1,
      );
    }

    default:
      return [];
  }
}

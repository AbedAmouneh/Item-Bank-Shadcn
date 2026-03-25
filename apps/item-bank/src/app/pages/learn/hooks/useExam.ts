import { useState, useCallback, useRef, useEffect } from 'react';

import { saveAnswer } from '@item-bank/api';
import type { QuestionAnswer } from '@item-bank/types';

interface UseExamReturn {
  /** Map of questionId → current answer. */
  answers: Record<number, QuestionAnswer>;
  /** Set of question ids the learner has flagged for review. */
  flagged: Set<number>;
  /**
   * Update an answer in local state and schedule a debounced server sync.
   * Call this on every answer change (radio click, text input change).
   */
  saveAnswerDebounced: (questionId: number, answer: QuestionAnswer) => void;
  /**
   * Update an answer in local state and immediately sync to the server.
   * Call this before navigating away (e.g. "Save & Next").
   */
  saveAnswerImmediate: (questionId: number, answer: QuestionAnswer) => Promise<void>;
  /** Toggle the flagged state for a question. */
  toggleFlag: (questionId: number) => void;
  /** Number of questions that currently have an answer. */
  answeredCount: number;
}

const DEBOUNCE_MS = 800;

/**
 * Manages local answer state for an active exam attempt.
 *
 * Server sync is best-effort: network errors on autosave are silenced
 * because the server is the ground truth on submission. Immediate saves
 * (before "Save & Next") re-throw so the caller can surface errors.
 */
export function useExam(attemptId: number): UseExamReturn {
  const [answers, setAnswers] = useState<Record<number, QuestionAnswer>>({});
  const [flagged, setFlagged] = useState<Set<number>>(new Set());
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear the debounce timer on unmount to avoid stale saves.
  useEffect(() => {
    return () => {
      if (debounceTimer.current !== null) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  const saveAnswerDebounced = useCallback(
    (questionId: number, answer: QuestionAnswer) => {
      setAnswers((prev) => ({ ...prev, [questionId]: answer }));

      if (debounceTimer.current !== null) {
        clearTimeout(debounceTimer.current);
      }

      debounceTimer.current = setTimeout(() => {
        saveAnswer(attemptId, questionId, answer.value).catch(() => {
          // Autosave failures are silenced — server holds ground truth.
        });
      }, DEBOUNCE_MS);
    },
    [attemptId],
  );

  const saveAnswerImmediate = useCallback(
    async (questionId: number, answer: QuestionAnswer) => {
      // Cancel any pending debounced save before the immediate one fires.
      if (debounceTimer.current !== null) {
        clearTimeout(debounceTimer.current);
        debounceTimer.current = null;
      }
      setAnswers((prev) => ({ ...prev, [questionId]: answer }));
      await saveAnswer(attemptId, questionId, answer.value);
    },
    [attemptId],
  );

  const toggleFlag = useCallback((questionId: number) => {
    setFlagged((prev) => {
      const next = new Set(prev);
      if (next.has(questionId)) {
        next.delete(questionId);
      } else {
        next.add(questionId);
      }
      return next;
    });
  }, []);

  const answeredCount = Object.keys(answers).length;

  return { answers, flagged, saveAnswerDebounced, saveAnswerImmediate, toggleFlag, answeredCount };
}

import { useMutation } from '@tanstack/react-query';

import { startAttempt } from '@item-bank/api';

/**
 * Mutation to start a new exam attempt.
 * Returns the AttemptSession (including questions and deadline_at) on success.
 */
export function useStartAttempt() {
  return useMutation({
    mutationFn: (assessmentId: number) => startAttempt(assessmentId),
  });
}

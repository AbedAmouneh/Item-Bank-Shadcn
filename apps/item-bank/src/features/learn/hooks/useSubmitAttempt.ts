import { useMutation } from '@tanstack/react-query';

import { submitAttempt } from '@item-bank/api';

/**
 * Mutation to submit the active attempt and receive the graded result.
 * Callers navigate to the results page on success.
 */
export function useSubmitAttempt() {
  return useMutation({
    mutationFn: (attemptId: number) => submitAttempt(attemptId),
  });
}

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { submitForReview } from '@item-bank/api';

/**
 * Mutation hook to submit a question for review.
 *
 * On success, invalidates `['questions', id]` so the detail view reflects
 * the new "In Review" status without a manual page refresh.
 */
export function useSubmitForReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => submitForReview(id),
    onSuccess: (_data, id) => {
      void queryClient.invalidateQueries({ queryKey: ['questions', id] });
      void queryClient.invalidateQueries({ queryKey: ['questions'] });
    },
  });
}

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { removeFromPool } from '@item-bank/api';

/**
 * Mutation to remove a single question from an assessment's pool.
 * Invalidates the pool query so the removed row disappears immediately.
 */
export function useRemoveFromPool(assessmentId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (questionId: number) => removeFromPool(assessmentId, questionId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['assessments', assessmentId, 'pool'],
      });
    },
  });
}

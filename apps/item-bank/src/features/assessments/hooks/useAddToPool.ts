import { useMutation, useQueryClient } from '@tanstack/react-query';

import { addToPool } from '@item-bank/api';
import type { AddToPoolData } from '@item-bank/api';

/**
 * Mutation to add questions to an assessment's pool.
 * Invalidates the pool query so the list refreshes automatically.
 */
export function useAddToPool(assessmentId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: AddToPoolData) => addToPool(assessmentId, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['assessments', assessmentId, 'pool'],
      });
    },
  });
}

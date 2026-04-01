import { useMutation, useQueryClient } from '@tanstack/react-query';

import { deleteAssessment } from '@item-bank/api';

/**
 * Mutation to delete an assessment.
 * Invalidates the list so the deleted row disappears immediately.
 */
export function useDeleteAssessment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => deleteAssessment(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['assessments'] });
    },
  });
}

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { updateAssessment } from '@item-bank/api';
import type { UpdateAssessmentData } from '@item-bank/api';

/**
 * Mutation to update an existing assessment.
 * Invalidates both the list and the specific record in the cache.
 */
export function useUpdateAssessment(id: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateAssessmentData) => updateAssessment(id, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['assessments'] });
    },
  });
}

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { createAssessment } from '@item-bank/api';
import type { CreateAssessmentData } from '@item-bank/api';

/**
 * Mutation to create a new assessment.
 * Invalidates the assessments list so it re-fetches automatically.
 */
export function useCreateAssessment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateAssessmentData) => createAssessment(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['assessments'] });
    },
  });
}

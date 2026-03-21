import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { updateQuestion } from '@item-bank/api';
import type { UpdateQuestionData } from '@item-bank/api';

/** Variables accepted by the update mutation. */
interface UpdateQuestionVariables {
  id: number;
  data: UpdateQuestionData;
}

/**
 * Mutation hook to update an existing question.
 *
 * On success, invalidates both:
 * - `['questions']` — refreshes every list view
 * - `['questions', id]` — refreshes the single-question detail view
 */
export function useUpdateQuestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: UpdateQuestionVariables) => updateQuestion(id, data),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['questions'] });
      void queryClient.invalidateQueries({ queryKey: ['questions', variables.id] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to update question');
    },
  });
}

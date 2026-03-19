import { useMutation, useQueryClient } from '@tanstack/react-query';

import { createQuestion } from '@item-bank/api';
import type { CreateQuestionData } from '@item-bank/api';

/**
 * Mutation hook to create a new question.
 *
 * On success, invalidates the `['questions']` query family so every list
 * view re-fetches and shows the new item.
 */
export function useCreateQuestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateQuestionData) => createQuestion(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['questions'] });
    },
  });
}

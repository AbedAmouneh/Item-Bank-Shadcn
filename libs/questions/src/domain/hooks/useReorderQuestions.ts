import { useMutation, useQueryClient } from '@tanstack/react-query';

import { reorderQuestions } from '@item-bank/api';

/**
 * Mutation hook to reorder questions on the server.
 *
 * On success, invalidates all `['questions', ...]` queries so list views
 * reflect the new order.
 */
export function useReorderQuestions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (questionIds: number[]) => reorderQuestions(questionIds),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['questions'], exact: false });
    },
  });
}

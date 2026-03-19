import { useMutation, useQueryClient } from '@tanstack/react-query';

import { deleteQuestion } from '@item-bank/api';

/**
 * Mutation hook to permanently delete a question.
 *
 * On success, invalidates the `['questions']` query family so list views
 * re-fetch and no longer show the deleted item.
 */
export function useDeleteQuestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => deleteQuestion(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['questions'] });
    },
  });
}

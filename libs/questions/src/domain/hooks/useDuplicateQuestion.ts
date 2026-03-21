import { useMutation, useQueryClient } from '@tanstack/react-query';

import { getQuestion, createQuestion } from '@item-bank/api';

interface DuplicateVariables {
  /** ID of the question to copy. */
  id: number;
  /** String prepended to the copied question's name (e.g. "Copy of "). */
  namePrefix: string;
}

/**
 * Mutation hook that fetches a full question by ID and creates a new copy of it.
 *
 * Using a mutation (rather than a direct `getQuestion` call in a component) lets
 * TanStack Query manage the async lifecycle so the component stays free of manual
 * promise handling and error swallowing.
 *
 * On success, invalidates the `['questions']` cache so list views reflect the copy.
 */
export function useDuplicateQuestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, namePrefix }: DuplicateVariables) => {
      const original = await getQuestion(id);
      return createQuestion({
        name: `${namePrefix}${original.name}`,
        type: original.type,
        text: original.text,
        mark: original.mark,
        content: original.content,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['questions'] });
    },
  });
}

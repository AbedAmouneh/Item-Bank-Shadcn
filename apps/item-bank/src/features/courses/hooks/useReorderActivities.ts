import { useMutation, useQueryClient } from '@tanstack/react-query';

import { reorderActivities } from '@item-bank/api';

/**
 * Mutation to persist a new activity order.
 * Pass `orderedIds` as the activity ids in the desired order.
 */
export function useReorderActivities() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ courseId, orderedIds }: { courseId: number; orderedIds: number[] }) =>
      reorderActivities(courseId, orderedIds),
    onSuccess: (_result, { courseId }) => {
      void queryClient.invalidateQueries({ queryKey: ['courses', courseId] });
    },
  });
}

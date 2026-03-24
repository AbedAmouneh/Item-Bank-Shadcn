import { useMutation, useQueryClient } from '@tanstack/react-query';

import { createActivity } from '@item-bank/api';
import type { CreateActivityData } from '@item-bank/api';

/**
 * Mutation to append a new activity to a course.
 * Invalidates the course detail query so the activity list refreshes.
 */
export function useCreateActivity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ courseId, data }: { courseId: number; data: CreateActivityData }) =>
      createActivity(courseId, data),
    onSuccess: (_result, { courseId }) => {
      void queryClient.invalidateQueries({ queryKey: ['courses', courseId] });
    },
  });
}

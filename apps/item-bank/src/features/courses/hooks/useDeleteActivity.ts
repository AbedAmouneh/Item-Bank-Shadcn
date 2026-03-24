import { useMutation, useQueryClient } from '@tanstack/react-query';

import { deleteActivity } from '@item-bank/api';

/**
 * Mutation to delete an activity from a course.
 */
export function useDeleteActivity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ courseId, activityId }: { courseId: number; activityId: number }) =>
      deleteActivity(courseId, activityId),
    onSuccess: (_result, { courseId }) => {
      void queryClient.invalidateQueries({ queryKey: ['courses', courseId] });
    },
  });
}

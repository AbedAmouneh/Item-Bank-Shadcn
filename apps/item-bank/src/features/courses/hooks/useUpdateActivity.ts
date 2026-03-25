import { useMutation, useQueryClient } from '@tanstack/react-query';

import { updateActivity } from '@item-bank/api';
import type { UpdateActivityData } from '@item-bank/api';

/**
 * Mutation to update fields on an existing activity.
 */
export function useUpdateActivity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      courseId,
      activityId,
      data,
    }: {
      courseId: number;
      activityId: number;
      data: UpdateActivityData;
    }) => updateActivity(courseId, activityId, data),
    onSuccess: (_result, { courseId }) => {
      void queryClient.invalidateQueries({ queryKey: ['courses', courseId] });
    },
  });
}

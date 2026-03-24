import { useMutation, useQueryClient } from '@tanstack/react-query';

import { unassignUser } from '@item-bank/api/courses';

/**
 * Mutation to remove a user assignment from a course.
 */
export function useUnassignUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ courseId, userId }: { courseId: number; userId: number }) =>
      unassignUser(courseId, userId),
    onSuccess: (_result, { courseId }) => {
      void queryClient.invalidateQueries({ queryKey: ['courses', courseId, 'assignments'] });
    },
  });
}

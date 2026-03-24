import { useMutation, useQueryClient } from '@tanstack/react-query';

import { assignUser } from '@item-bank/api';
import type { AssignUserData } from '@item-bank/api';

/**
 * Mutation to assign a user to a course.
 */
export function useAssignUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ courseId, data }: { courseId: number; data: AssignUserData }) =>
      assignUser(courseId, data),
    onSuccess: (_result, { courseId }) => {
      void queryClient.invalidateQueries({ queryKey: ['courses', courseId, 'assignments'] });
    },
  });
}

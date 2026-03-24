import { useMutation, useQueryClient } from '@tanstack/react-query';

import { completeModule } from '@item-bank/api';

/**
 * Mutation to mark a module as complete.
 * Invalidates the learner-course query on success so the sidebar re-renders
 * with the updated completed/locked states from the server.
 *
 * @param courseId - Used for cache invalidation after success.
 */
export function useCompleteModule(courseId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (moduleId: number) => completeModule(courseId, moduleId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['learner-course', courseId] });
    },
  });
}

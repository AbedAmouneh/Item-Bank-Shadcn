import { useMutation, useQueryClient } from '@tanstack/react-query';

import { deleteCourse } from '@item-bank/api';

/**
 * Mutation to permanently delete a course.
 * Invalidates the courses list after deletion.
 */
export function useDeleteCourse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => deleteCourse(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['courses'] });
    },
  });
}

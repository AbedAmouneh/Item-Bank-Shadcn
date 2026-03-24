import { useMutation, useQueryClient } from '@tanstack/react-query';

import { updateCourse } from '@item-bank/api';
import type { UpdateCourseData } from '@item-bank/api';

/**
 * Mutation to update a course's title, description, or status.
 * Invalidates both the list and the individual course query.
 */
export function useUpdateCourse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateCourseData }) =>
      updateCourse(id, data),
    onSuccess: (_result, { id }) => {
      void queryClient.invalidateQueries({ queryKey: ['courses'] });
      void queryClient.invalidateQueries({ queryKey: ['courses', id] });
    },
  });
}

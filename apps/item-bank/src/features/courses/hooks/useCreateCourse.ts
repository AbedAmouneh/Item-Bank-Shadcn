import { useMutation, useQueryClient } from '@tanstack/react-query';

import { createCourse } from '@item-bank/api/courses';
import type { CreateCourseData } from '@item-bank/api/courses';

/**
 * Mutation to create a new course.
 * Invalidates the courses list so the grid re-fetches automatically.
 */
export function useCreateCourse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCourseData) => createCourse(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['courses'] });
    },
  });
}

import { useQuery } from '@tanstack/react-query';

import { getCourseAssignments } from '@item-bank/api';

/**
 * Fetch all users assigned to a course.
 */
export function useCourseAssignments(courseId: number) {
  return useQuery({
    queryKey: ['courses', courseId, 'assignments'],
    queryFn: () => getCourseAssignments(courseId),
    enabled: courseId > 0,
  });
}

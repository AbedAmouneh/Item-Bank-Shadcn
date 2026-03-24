import { useQuery } from '@tanstack/react-query';

import { getLearnerCourse } from '@item-bank/api';

/**
 * Fetch a single learner course with its full module list.
 * Disabled when id is 0 or NaN to prevent requests before the route param resolves.
 *
 * @param id - Numeric course id (parsed from the URL param).
 */
export function useLearnerCourse(id: number) {
  return useQuery({
    queryKey: ['learner-course', id],
    queryFn: () => getLearnerCourse(id),
    enabled: id > 0,
  });
}

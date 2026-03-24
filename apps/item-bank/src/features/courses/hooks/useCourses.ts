import { useQuery } from '@tanstack/react-query';

import { getCourses } from '@item-bank/api';

/**
 * Fetch the full list of courses.
 * Results are cached under the `['courses']` query key.
 */
export function useCourses() {
  return useQuery({
    queryKey: ['courses'],
    queryFn: () => getCourses(),
    select: (page) => page.items,
  });
}

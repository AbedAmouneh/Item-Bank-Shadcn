import { useQuery } from '@tanstack/react-query';

import { getCourse } from '@item-bank/api';

/**
 * Fetch a single course by id.
 * Disabled when id is 0 or NaN to prevent accidental requests.
 */
export function useCourse(id: number) {
  return useQuery({
    queryKey: ['courses', id],
    queryFn: () => getCourse(id),
    enabled: id > 0,
  });
}

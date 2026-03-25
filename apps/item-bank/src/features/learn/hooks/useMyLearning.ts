import { useQuery } from '@tanstack/react-query';

import { getMyLearning } from '@item-bank/api';

/**
 * Fetch the current learner's full dashboard data (courses, exams, assignments).
 * Returns the raw TanStack Query result — no additional shaping.
 */
export function useMyLearning() {
  return useQuery({
    queryKey: ['my-learning'],
    queryFn: getMyLearning,
  });
}

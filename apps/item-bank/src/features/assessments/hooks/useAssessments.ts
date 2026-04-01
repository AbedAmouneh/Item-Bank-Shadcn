import { useQuery } from '@tanstack/react-query';

import { getAssessments } from '@item-bank/api';
import type { GetAssessmentsParams } from '@item-bank/api';

/**
 * Fetch the paginated list of assessments.
 * Results are cached under ['assessments', params] so different filters
 * don't clobber each other in the cache.
 */
export function useAssessments(params: GetAssessmentsParams = {}) {
  return useQuery({
    queryKey: ['assessments', params],
    queryFn: () => getAssessments(params),
  });
}

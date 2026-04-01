import { useQuery } from '@tanstack/react-query';

import { getQuestionPool } from '@item-bank/api';

/**
 * Fetch the list of questions in an assessment's pool.
 * Disabled when assessmentId is 0 (new/unsaved assessment).
 */
export function useQuestionPool(assessmentId: number) {
  return useQuery({
    queryKey: ['assessments', assessmentId, 'pool'],
    queryFn: () => getQuestionPool(assessmentId),
    enabled: assessmentId > 0,
  });
}

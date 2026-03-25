import { useQuery } from '@tanstack/react-query';

import { getAssessmentBrief } from '@item-bank/api';

/**
 * Fetch the pre-exam briefing for one assessment.
 * Disabled when id is 0 or NaN to prevent requests before the URL param resolves.
 *
 * @param id - Numeric assessment id (parsed from the URL param).
 */
export function useAssessmentBrief(id: number) {
  return useQuery({
    queryKey: ['assessment-brief', id],
    queryFn: () => getAssessmentBrief(id),
    enabled: id > 0,
  });
}

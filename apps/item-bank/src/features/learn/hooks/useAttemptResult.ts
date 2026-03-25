import { useQuery } from '@tanstack/react-query';

import { getAttemptResult } from '@item-bank/api';

/**
 * Fetch a previously graded attempt result by attempt id.
 * Used on ExamResultsPage and AnswerReviewPage.
 *
 * @param attemptId - Numeric attempt id (parsed from the URL param).
 */
export function useAttemptResult(attemptId: number) {
  return useQuery({
    queryKey: ['attempt-result', attemptId],
    queryFn: () => getAttemptResult(attemptId),
    enabled: attemptId > 0,
  });
}

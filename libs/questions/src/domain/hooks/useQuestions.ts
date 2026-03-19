import { useQuery } from '@tanstack/react-query';

import { getQuestions } from '@item-bank/api';
import type { GetQuestionsParams } from '@item-bank/api';

/**
 * Fetch a paginated, optionally filtered list of questions.
 *
 * The query key includes the full params object so that each unique
 * combination of filters is cached independently — changing the page or
 * search term triggers a fresh fetch without discarding other cached pages.
 *
 * @param params - Optional filters: page, limit, type, status, item_bank_id, search.
 */
export function useQuestions(params?: GetQuestionsParams) {
  return useQuery({
    queryKey: ['questions', params],
    queryFn: () => getQuestions(params),
  });
}

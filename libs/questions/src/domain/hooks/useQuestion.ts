import { useQuery } from '@tanstack/react-query';

import { getQuestion } from '@item-bank/api';

/**
 * Fetch a single question by its numeric ID.
 *
 * The query is disabled when `id` is falsy (e.g. 0 or undefined cast to
 * number) so the hook is safe to call before the ID is known.
 *
 * @param id - The question's database ID.
 */
export function useQuestion(id: number) {
  return useQuery({
    queryKey: ['questions', id],
    queryFn: () => getQuestion(id),
    enabled: !!id,
  });
}

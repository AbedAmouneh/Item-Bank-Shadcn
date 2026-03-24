import { useQuery } from '@tanstack/react-query';

import { getItemBank } from '@item-bank/api';

/**
 * Fetch a single item bank by its numeric ID.
 *
 * The query is disabled when `id` is falsy so the hook is safe to call
 * before the ID is available (e.g. while a route param is still being parsed).
 *
 * @param id - The item bank's database ID.
 */
export function useItemBank(id: number) {
  return useQuery({
    queryKey: ['item-banks', id],
    queryFn: () => getItemBank(id),
    enabled: !!id,
  });
}

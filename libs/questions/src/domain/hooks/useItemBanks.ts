import { useQuery } from '@tanstack/react-query';

import { getItemBanks } from '@item-bank/api';
import type { GetItemBanksParams } from '@item-bank/api';

/**
 * Fetch a paginated, optionally filtered list of item banks.
 *
 * The query key includes the full params object so that each unique filter
 * combination is cached independently. Changing `search` or `page` triggers
 * a fresh fetch without discarding other cached results.
 *
 * @param params - Optional filters: page, limit, search.
 */
export function useItemBanks(params?: GetItemBanksParams) {
  return useQuery({
    queryKey: ['item-banks', params],
    queryFn: () => getItemBanks(params),
  });
}

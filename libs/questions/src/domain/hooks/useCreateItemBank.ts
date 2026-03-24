import { useMutation, useQueryClient } from '@tanstack/react-query';

import { createItemBank } from '@item-bank/api';

/**
 * Mutation hook to create a new item bank.
 *
 * On success, invalidates all `['item-banks', ...]` queries so list views
 * re-fetch and show the newly created bank immediately.
 */
export function useCreateItemBank() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { name: string; description?: string }) => createItemBank(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['item-banks'] });
    },
  });
}

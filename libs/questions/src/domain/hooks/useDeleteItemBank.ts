import { useMutation, useQueryClient } from '@tanstack/react-query';

import { deleteItemBank } from '@item-bank/api';

/**
 * Mutation hook to permanently delete an item bank.
 *
 * On success, invalidates all `['item-banks', ...]` queries so list views
 * re-fetch and no longer display the deleted bank.
 */
export function useDeleteItemBank() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => deleteItemBank(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['item-banks'], exact: false });
    },
  });
}

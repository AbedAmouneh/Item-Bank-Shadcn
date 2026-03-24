import { useMutation, useQueryClient } from '@tanstack/react-query';

import { updateItemBank } from '@item-bank/api';

interface UpdateItemBankVariables {
  id: number;
  data: { name?: string; description?: string };
}

/**
 * Mutation hook to update an existing item bank.
 *
 * On success, invalidates both the list query family and the specific
 * bank's detail query so both views reflect the change immediately.
 */
export function useUpdateItemBank() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: UpdateItemBankVariables) => updateItemBank(id, data),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['item-banks'] });
      void queryClient.invalidateQueries({ queryKey: ['item-banks', variables.id] });
    },
  });
}

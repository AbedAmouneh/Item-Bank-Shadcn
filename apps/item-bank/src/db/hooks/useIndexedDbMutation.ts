import { useMutation, useQueryClient } from '@tanstack/react-query';
import { set, remove } from '../client';
import type { RecordWithId } from '../client';
import type { StoreName } from '../constants';
import { indexedDbQueryKeys } from './useIndexedDbQuery';

export function useIndexedDbSetMutation(storeName: StoreName) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (value: RecordWithId) => set(storeName, value),
    onSuccess: (_, value) => {
      queryClient.invalidateQueries({ queryKey: indexedDbQueryKeys.all(storeName) });
      queryClient.invalidateQueries({
        queryKey: indexedDbQueryKeys.one(storeName, value.id),
      });
    },
  });
}

export function useIndexedDbRemoveMutation(storeName: StoreName) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (key: string) => remove(storeName, key),
    onSuccess: (_, key) => {
      queryClient.invalidateQueries({ queryKey: indexedDbQueryKeys.all(storeName) });
      queryClient.invalidateQueries({
        queryKey: indexedDbQueryKeys.one(storeName, key),
      });
    },
  });
}

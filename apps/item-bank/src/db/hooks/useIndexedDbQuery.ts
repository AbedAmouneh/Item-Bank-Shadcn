import { useQuery } from '@tanstack/react-query';
import { get, getAll } from '../client';
import type { StoreName } from '../constants';

export const indexedDbQueryKeys = {
  all: (storeName: StoreName) => ['indexed-db', storeName] as const,
  one: (storeName: StoreName, key: string) =>
    ['indexed-db', storeName, key] as const,
};

export function useIndexedDbQuery<T>(storeName: StoreName, key: string) {
  return useQuery({
    queryKey: indexedDbQueryKeys.one(storeName, key),
    queryFn: () => get<T>(storeName, key),
    enabled: !!key,
  });
}

export function useIndexedDbQueryAll<T>(storeName: StoreName) {
  return useQuery({
    queryKey: indexedDbQueryKeys.all(storeName),
    queryFn: () => getAll<T>(storeName),
  });
}

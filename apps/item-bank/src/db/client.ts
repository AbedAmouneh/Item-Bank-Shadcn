import { getDb } from './db';
import type { StoreName } from './constants';

export interface RecordWithId {
  id: string;
  [key: string]: unknown;
}

async function getStore(
  storeName: StoreName,
  mode: IDBTransactionMode = 'readonly'
): Promise<{ db: IDBDatabase; store: IDBObjectStore }> {
  const db = await getDb();
  const store = db.transaction(storeName, mode).objectStore(storeName);
  return { db, store };
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function get<T>(storeName: StoreName, key: string): Promise<T | undefined> {
  const { store } = await getStore(storeName);
  const result = await requestToPromise(store.get(key));
  return result as T | undefined;
}

export async function set(storeName: StoreName, value: RecordWithId): Promise<void> {
  const { store } = await getStore(storeName, 'readwrite');
  await requestToPromise(store.put(value));
}

export async function remove(storeName: StoreName, key: string): Promise<void> {
  const { store } = await getStore(storeName, 'readwrite');
  await requestToPromise(store.delete(key));
}

export async function getAll<T>(storeName: StoreName): Promise<T[]> {
  const { store } = await getStore(storeName);
  const result = await requestToPromise(store.getAll());
  return (result ?? []) as T[];
}

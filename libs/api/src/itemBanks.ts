/**
 * Item bank API functions.
 *
 * Each function maps to one REST endpoint and delegates all HTTP mechanics
 * (credentials, CSRF, 401 retry) to `apiRequest` in ./client.
 */

import { apiRequest } from './client';

/** Server response envelope — every success response is wrapped in this. */
interface Envelope<T> {
  success: boolean;
  data: T;
}

/** An item bank as returned by the server. */
export interface ItemBank {
  id: number;
  name: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

/** Paginated list response returned by GET /item-banks. */
export interface ItemBanksPage {
  items: ItemBank[];
  total: number;
  page: number;
  limit: number;
}

/** Optional filters accepted by GET /item-banks. */
export interface GetItemBanksParams {
  page?: number;
  limit?: number;
  search?: string;
}

/**
 * Fetch a paginated, optionally filtered list of item banks.
 *
 * @param params - Optional query-string filters (page, limit, search).
 * @returns      A page of item banks plus pagination metadata.
 */
export async function getItemBanks(params?: GetItemBanksParams): Promise<ItemBanksPage> {
  const query = new URLSearchParams();
  if (params?.page !== undefined) query.set('page', String(params.page));
  if (params?.limit !== undefined) query.set('limit', String(params.limit));
  if (params?.search !== undefined) query.set('search', params.search);

  const qs = query.toString() ? `?${query.toString()}` : '';
  const envelope = await apiRequest<Envelope<ItemBanksPage>>(`/item-banks${qs}`);
  return envelope.data;
}

/**
 * Fetch a single item bank by its numeric ID.
 *
 * @param id - The item bank's database ID.
 * @returns  The full item bank object.
 */
export async function getItemBank(id: number): Promise<ItemBank> {
  const envelope = await apiRequest<Envelope<ItemBank>>(`/item-banks/${id}`);
  return envelope.data;
}

/**
 * Create a new item bank on the server.
 *
 * @param data - Name and optional description for the new item bank.
 * @returns    The created item bank as persisted by the server.
 */
export async function createItemBank(data: {
  name: string;
  description?: string;
}): Promise<ItemBank> {
  const envelope = await apiRequest<Envelope<ItemBank>>('/item-banks', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return envelope.data;
}

/**
 * Update one or more fields on an existing item bank.
 *
 * @param id   - The item bank's database ID.
 * @param data - The subset of fields to change.
 * @returns    The updated item bank.
 */
export async function updateItemBank(
  id: number,
  data: { name?: string; description?: string },
): Promise<ItemBank> {
  const envelope = await apiRequest<Envelope<ItemBank>>(`/item-banks/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  return envelope.data;
}

/**
 * Permanently delete an item bank by ID.
 *
 * @param id - The item bank's database ID.
 */
export async function deleteItemBank(id: number): Promise<void> {
  await apiRequest<void>(`/item-banks/${id}`, { method: 'DELETE' });
}

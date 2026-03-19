/**
 * Tag API functions.
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

/** A tag as returned by the server. */
export interface Tag {
  id: number;
  name: string;
  slug: string;
}

/**
 * Fetch all tags.
 *
 * Tags are a small, stable list so no pagination is applied.
 *
 * @returns An array of all tags.
 */
export async function getTags(): Promise<Tag[]> {
  const envelope = await apiRequest<Envelope<Tag[]>>('/tags');
  return envelope.data;
}

/**
 * Create a new tag on the server.
 *
 * @param data - Name and URL-safe slug for the new tag.
 * @returns    The created tag as persisted by the server.
 */
export async function createTag(data: { name: string; slug: string }): Promise<Tag> {
  const envelope = await apiRequest<Envelope<Tag>>('/tags', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return envelope.data;
}

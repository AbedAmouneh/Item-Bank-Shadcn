/**
 * Admin API functions.
 *
 * All endpoints require the authenticated user to have the 'admin' role.
 * The role check is enforced server-side; the client-side guard in the
 * Users page is an extra UX convenience, not a security boundary.
 */

import { apiRequest } from './client';

/** A user record as returned by the admin endpoints. */
export interface AdminUser {
  id: string;
  email: string;
  role: 'admin' | 'user';
  is_active: boolean;
  last_login?: string | null;
}

/** Paginated list of users from GET /admin/users. */
export interface AdminUsersPage {
  items: AdminUser[];
  total: number;
  page: number;
  per_page: number;
}

/** Optional query parameters for listing users. */
export interface GetUsersParams {
  page?: number;
  per_page?: number;
}

/** Payload for creating a new user. */
export interface CreateUserData {
  email: string;
  password: string;
  role: 'admin' | 'user';
}

interface Envelope<T> {
  success: boolean;
  data: T;
}

/**
 * Fetch a paginated list of all users.
 *
 * @param params - Optional pagination parameters.
 * @returns      Paginated user list.
 */
export async function getUsers(params: GetUsersParams = {}): Promise<AdminUsersPage> {
  const query = new URLSearchParams();
  if (params.page !== undefined) query.set('page', String(params.page));
  if (params.per_page !== undefined) query.set('per_page', String(params.per_page));
  const qs = query.toString() ? `?${query.toString()}` : '';
  const envelope = await apiRequest<Envelope<AdminUsersPage>>(`/admin/users${qs}`);
  return envelope.data;
}

/**
 * Create a new user account.
 *
 * @param data - Email, password, and role for the new user.
 * @returns    The newly created user.
 */
export async function createUser(data: CreateUserData): Promise<AdminUser> {
  const envelope = await apiRequest<Envelope<AdminUser>>('/admin/users', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return envelope.data;
}

/**
 * Activate a previously deactivated user account.
 *
 * @param id - The user's ID.
 * @returns  The updated user record.
 */
export async function activateUser(id: string): Promise<AdminUser> {
  const envelope = await apiRequest<Envelope<AdminUser>>(`/admin/users/${id}/activate`, {
    method: 'POST',
  });
  return envelope.data;
}

/**
 * Deactivate an active user account.
 *
 * @param id - The user's ID.
 * @returns  The updated user record.
 */
export async function deactivateUser(id: string): Promise<AdminUser> {
  const envelope = await apiRequest<Envelope<AdminUser>>(`/admin/users/${id}/deactivate`, {
    method: 'POST',
  });
  return envelope.data;
}

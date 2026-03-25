/**
 * Admin API functions.
 *
 * All endpoints require the authenticated user to have the 'admin' role.
 * The role check is enforced server-side; the client-side guard in the
 * Users page is an extra UX convenience, not a security boundary.
 */

import { apiRequest } from './client';
import type { ItemBank } from './itemBanks';

/** A user record as returned by the admin endpoints. */
export interface AdminUser {
  id: string;
  email: string;
  role: 'admin' | 'user' | 'learner';
  is_active: boolean;
  last_login?: string | null;
  /** Controls which item banks the user can access. */
  course_assignment_mode?: 'all_access' | 'assigned_only';
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
  role: 'admin' | 'user' | 'learner';
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

/** Fields that can be changed when editing an existing user. */
export interface UpdateUserData {
  email?: string;
  role?: 'admin' | 'user' | 'learner';
  course_assignment_mode?: 'all_access' | 'assigned_only';
}

/**
 * Update an existing user's email or role.
 *
 * @param id   - The user's ID.
 * @param data - Fields to update.
 * @returns    The updated user record.
 */
export async function updateUser(id: string, data: UpdateUserData): Promise<AdminUser> {
  const envelope = await apiRequest<{ success: boolean; data: AdminUser }>(
    `/admin/users/${id}`,
    {
      method: 'PUT',
      body: JSON.stringify(data),
    }
  );
  return envelope.data;
}

// ── Item-bank access management ────────────────────────────────────────────────

/**
 * Fetch the list of item banks explicitly assigned to a user.
 *
 * Only relevant when the user's course_assignment_mode is "assigned_only".
 *
 * @param userId - The numeric database ID of the user.
 * @returns      Array of item banks assigned to that user.
 */
export async function getUserItemBanks(userId: number): Promise<ItemBank[]> {
  const envelope = await apiRequest<Envelope<ItemBank[]>>(
    `/admin/users/${userId}/item-banks`,
  );
  return envelope.data;
}

/**
 * Assign an item bank to a user.
 *
 * @param userId     - The numeric database ID of the user.
 * @param itemBankId - The ID of the item bank to assign.
 */
export async function assignItemBankToUser(
  userId: number,
  itemBankId: number,
): Promise<void> {
  await apiRequest<void>(`/admin/users/${userId}/item-banks/${itemBankId}`, {
    method: 'POST',
  });
}

/**
 * Remove a previously assigned item bank from a user.
 *
 * @param userId     - The numeric database ID of the user.
 * @param itemBankId - The ID of the item bank to remove.
 */
export async function removeItemBankFromUser(
  userId: number,
  itemBankId: number,
): Promise<void> {
  await apiRequest<void>(`/admin/users/${userId}/item-banks/${itemBankId}`, {
    method: 'DELETE',
  });
}

// ── Audit Log ──────────────────────────────────────────────────────────────

/** A single audit log entry as returned by GET /admin/audit-logs. */
export interface AuditLog {
  id: number;
  user_id: number | null;
  /** Display name resolved server-side; absent when the user has been deleted. */
  user_name?: string | null;
  action: string;
  entity_type: string;
  entity_id?: string | null;
  /** Values before the change — present for update/delete events. */
  old_values?: Record<string, unknown> | null;
  /** Values after the change — present for create/update events. */
  new_values?: Record<string, unknown> | null;
  /** Client IP address recorded at event time. */
  ip_address: string;
  /** ISO timestamp of when the event was recorded. */
  timestamp: string;
}

/** Query parameters accepted by GET /admin/audit-logs. */
export interface GetAuditLogsParams {
  page?: number;
  limit?: number;
  user_id?: number;
  entity_type?: string;
  action?: string;
  /** ISO date string — inclusive lower bound on created_at. */
  from?: string;
  /** ISO date string — inclusive upper bound on created_at. */
  to?: string;
}

/**
 * Fetch a paginated, filtered list of audit log entries.
 *
 * @param params - Pagination and filter options.
 * @returns      Page of entries and the server-side total count.
 */
export async function getAuditLogs(
  params: GetAuditLogsParams = {},
): Promise<{ items: AuditLog[]; total: number }> {
  const query = new URLSearchParams();
  if (params.page !== undefined) query.set('page', String(params.page));
  if (params.limit !== undefined) query.set('limit', String(params.limit));
  if (params.user_id !== undefined) query.set('user_id', String(params.user_id));
  if (params.entity_type) query.set('entity_type', params.entity_type);
  if (params.action) query.set('action', params.action);
  if (params.from) query.set('from', params.from);
  if (params.to) query.set('to', params.to);
  const qs = query.toString() ? `?${query.toString()}` : '';
  const envelope = await apiRequest<Envelope<{ items: AuditLog[]; total: number }>>(
    `/admin/audit-logs${qs}`,
  );
  return envelope.data;
}

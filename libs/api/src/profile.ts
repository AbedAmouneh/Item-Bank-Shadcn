/**
 * Profile API functions.
 *
 * Wraps the /profile/* endpoints and delegates all HTTP mechanics
 * (credentials, CSRF, retries) to `apiRequest` in ./client.
 */

import { apiRequest } from './client';

/** Shape of the user profile returned by GET /profile/me and PUT /profile/me. */
export interface UserProfile {
  id: string;
  first_name: string;
  last_name: string;
  username: string;
  phone_number: string;
  email: string;
  role: string;
}

/** Fields that can be updated via PUT /profile/me. */
export interface UpdateProfileData {
  first_name?: string;
  last_name?: string;
  phone_number?: string;
}

/** Payload for PUT /profile/change-password. */
export interface ChangePasswordData {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

interface Envelope<T> {
  success: boolean;
  data: T;
}

/**
 * Fetch the current user's full profile.
 *
 * @returns The authenticated user's profile fields.
 */
export async function getProfile(): Promise<UserProfile> {
  const envelope = await apiRequest<Envelope<UserProfile>>('/profile/me');
  return envelope.data;
}

/**
 * Update mutable profile fields for the current user.
 *
 * @param data - Partial profile update (name, phone number).
 * @returns    The updated profile as returned by the server.
 */
export async function updateProfile(data: UpdateProfileData): Promise<UserProfile> {
  const envelope = await apiRequest<Envelope<UserProfile>>('/profile/me', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  return envelope.data;
}

/**
 * Change the current user's password.
 *
 * @param data - Current password plus new password (confirmed twice).
 */
export async function changePassword(data: ChangePasswordData): Promise<void> {
  await apiRequest<void>('/profile/change-password', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

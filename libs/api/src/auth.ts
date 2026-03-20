/**
 * Authentication API functions.
 *
 * Each function wraps a specific auth endpoint and delegates all HTTP
 * mechanics (credentials, CSRF, retries) to `apiRequest` in ./client.
 */

import { apiRequest, clearCsrfToken, setCsrfToken } from './client';

/** Shape of the user object returned by the server on login and /me. */
export interface ApiUser {
  id: string;
  email: string;
  role: string;
  is_active: boolean;
}

/** Shape of the login response body from POST /account/login. */
export interface LoginResponse {
  csrf_token: string;
  expires_in: number;
  user: ApiUser;
}

/**
 * The server wraps every success response in { success: true, data: <payload> }.
 * This interface represents that outer envelope so we can unwrap it.
 */
interface Envelope<T> {
  success: boolean;
  data: T;
}

/**
 * Authenticate with email + password credentials.
 *
 * The server sets the httpOnly JWT cookie in the response. This function
 * also stores the returned CSRF token so subsequent mutating requests are
 * automatically protected.
 *
 * @param email    - The user's email address.
 * @param password - The user's plaintext password (sent over HTTPS).
 * @returns        The full login response including the user object.
 */
export async function login(
  email: string,
  password: string,
): Promise<LoginResponse> {
  const envelope = await apiRequest<Envelope<LoginResponse>>('/account/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

  setCsrfToken(envelope.data.csrf_token);

  return envelope.data;
}

/**
 * Fetch the currently authenticated user's profile.
 *
 * Relies on the httpOnly JWT cookie being present in the browser.
 *
 * @returns The authenticated user's profile.
 */
export async function getMe(): Promise<ApiUser> {
  const envelope = await apiRequest<Envelope<ApiUser>>('/account/me');
  return envelope.data;
}

/** Shape of the data payload returned by POST /account/refresh. */
interface RefreshTokenData {
  csrf_token: string;
}

/**
 * Obtain a fresh CSRF token for the current session.
 *
 * The httpOnly JWT cookie is long-lived, but the CSRF token only exists in
 * JavaScript memory and is lost whenever the page is refreshed. Call this
 * after restoring a session from the cookie (e.g. on app boot) so that
 * subsequent mutating requests carry a valid CSRF header.
 */
export async function refreshToken(): Promise<void> {
  const envelope = await apiRequest<Envelope<RefreshTokenData>>(
    '/account/refresh',
    { method: 'POST' },
  );
  setCsrfToken(envelope.data.csrf_token);
}

/**
 * Sign the current user out.
 *
 * The CSRF token is cleared regardless of whether the server request
 * succeeds, so local auth state is always cleaned up.
 */
export async function logout(): Promise<void> {
  try {
    await apiRequest<void>('/account/logout', { method: 'POST' });
  } finally {
    clearCsrfToken();
  }
}

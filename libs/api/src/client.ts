/**
 * Central HTTP client for the Item Bank API.
 *
 * - Reads the base URL from the Vite environment variable VITE_API_BASE_URL.
 * - Sends credentials (httpOnly JWT cookie) on every request via
 *   `credentials: 'include'`.
 * - Manages a CSRF token in module scope; injects it as the `X-CSRF-Token`
 *   header on every non-GET request.
 * - Handles 401 responses by attempting a silent token refresh once before
 *   emitting an `auth:logout` event so the app can redirect to login.
 */

const BASE_URL: string = import.meta.env.VITE_API_BASE_URL as string;

/** HTTP methods that carry a request body and require CSRF protection. */
const MUTATING_METHODS = new Set(['POST', 'PUT', 'DELETE', 'PATCH']);

/** In-module CSRF token, updated after login and each silent refresh. */
let csrfToken: string | null = null;

/** Store a new CSRF token (called after login or a successful refresh). */
export function setCsrfToken(token: string): void {
  csrfToken = token;
}

/** Clear the CSRF token (called on logout). */
export function clearCsrfToken(): void {
  csrfToken = null;
}

/**
 * Build a Headers object for the given request options, injecting the
 * CSRF token when the request uses a mutating HTTP method.
 */
function buildHeaders(method: string, existing?: HeadersInit): Headers {
  const headers = new Headers(existing);

  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (MUTATING_METHODS.has(method.toUpperCase()) && csrfToken !== null) {
    headers.set('X-CSRF-Token', csrfToken);
  }

  return headers;
}

/**
 * Attempt a silent token refresh by hitting POST /account/refresh.
 * The refresh_token cookie is included automatically via `credentials: 'include'`.
 *
 * @returns The new CSRF token string, or `null` if the refresh failed.
 */
async function attemptRefresh(): Promise<string | null> {
  try {
    const response = await fetch(`${BASE_URL}/account/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      return null;
    }

    const body = (await response.json()) as { csrf_token?: string };
    return body.csrf_token ?? null;
  } catch {
    return null;
  }
}

/**
 * Execute a fetch call with the base URL prepended and credentials included.
 * Returns the raw Response without any body parsing.
 */
async function fetchRaw(path: string, options: RequestInit): Promise<Response> {
  const method = (options.method ?? 'GET').toUpperCase();
  const headers = buildHeaders(method, options.headers);

  // For FormData bodies the browser must set Content-Type itself so it can
  // append the multipart boundary parameter.  Remove the default JSON header.
  if (options.body instanceof FormData) {
    headers.delete('Content-Type');
  }

  return fetch(`${BASE_URL}${path}`, {
    ...options,
    method,
    credentials: 'include',
    headers,
  });
}

/**
 * Parse a non-2xx Response into an Error, using the body's `error.message`
 * field when available, otherwise falling back to a generic message.
 */
async function parseErrorResponse(response: Response): Promise<Error> {
  try {
    const body = (await response.json()) as { error?: { message?: string } };
    const message = body.error?.message;
    if (message) {
      return new Error(message);
    }
  } catch {
    // Body was not valid JSON — fall through to generic message.
  }

  return new Error(`Request failed with status ${response.status}`);
}

/**
 * Make an authenticated API request.
 *
 * @param path    - API path (e.g. `/account/me`). The base URL is prepended.
 * @param options - Standard `RequestInit` options (method, body, headers, etc.).
 * @returns       The parsed JSON response body typed as `T`.
 * @throws        An `Error` if the request fails after exhausting the refresh
 *                retry, or if the server returns a non-2xx status.
 */
export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  let response = await fetchRaw(path, options);

  // Silent refresh on 401: try once to obtain a new access token.
  // Skip the retry for auth endpoints that return 401 as a business response
  // (e.g. wrong password on /account/login) — those should surface the real error.
  const isAuthEndpoint = path === '/account/login' || path === '/account/refresh';
  if (response.status === 401 && !isAuthEndpoint) {
    const newCsrfToken = await attemptRefresh();

    if (newCsrfToken !== null) {
      setCsrfToken(newCsrfToken);
      // Retry the original request — headers are rebuilt inside fetchRaw.
      response = await fetchRaw(path, options);
    }

    // If the refresh itself failed, or the retry still returns 401, force logout.
    if (response.status === 401) {
      window.dispatchEvent(new Event('auth:logout'));
      throw new Error('Session expired. Please log in again.');
    }
  }

  if (!response.ok) {
    throw await parseErrorResponse(response);
  }

  // For auth endpoints that returned 401 (wrong credentials etc.),
  // fall through to parseErrorResponse via the !response.ok branch above.

  return response.json() as Promise<T>;
}

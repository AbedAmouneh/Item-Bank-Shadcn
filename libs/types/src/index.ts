/**
 * Shared TypeScript interfaces and DTOs.
 *
 * This library sits at the bottom of the dependency order — every other lib
 * may import from it, but it may not import from any other @item-bank/* lib.
 */

/** The authenticated user shape used throughout the app. */
export interface AuthUser {
  id: string;
  email: string;
  /**
   * @deprecated Kept for NavBar backward compatibility only.
   * All new guard and UI logic must read from `roles`.
   * Remove once NavBar is updated to consume `roles` directly.
   */
  role: 'admin' | 'user';
  /** Multi-role array — the primary source of truth for all guard and UI logic. */
  roles: string[];
  tenant_id: string;
  is_active: boolean;
}

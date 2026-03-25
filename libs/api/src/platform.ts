/**
 * Platform API functions.
 *
 * All endpoints require the authenticated user to have a platform role
 * (super_admin or sales). The client-side PlatformRoute guard enforces this;
 * the server also enforces it independently.
 */

import { apiRequest } from './client';
import type {
  PlatformStats,
  Tenant,
  TenantsPage,
  CreateTenantData,
  CreateTenantResponse,
  UpdateTenantData,
  TenantUser,
  TenantUsage,
  GetTenantsParams,
} from '@item-bank/types';

interface Envelope<T> {
  success: boolean;
  data: T;
}

/**
 * Fetch aggregated platform statistics.
 *
 * @returns Total org count, active count, user count, and seats used.
 */
export async function getPlatformStats(): Promise<PlatformStats> {
  const envelope = await apiRequest<Envelope<PlatformStats>>('/platform/stats');
  return envelope.data;
}

/**
 * Fetch a paginated, searchable list of tenants.
 *
 * @param params - Pagination, search, and sort options.
 * @returns      Page of tenant records.
 */
export async function getTenants(params: GetTenantsParams = {}): Promise<TenantsPage> {
  const query = new URLSearchParams();
  if (params.page !== undefined) query.set('page', String(params.page));
  if (params.per_page !== undefined) query.set('per_page', String(params.per_page));
  if (params.search) query.set('search', params.search);
  if (params.sort_by) query.set('sort_by', params.sort_by);
  if (params.sort_dir) query.set('sort_dir', params.sort_dir);
  const qs = query.toString() ? `?${query.toString()}` : '';
  const envelope = await apiRequest<Envelope<TenantsPage>>(`/platform/tenants${qs}`);
  return envelope.data;
}

/**
 * Fetch a single tenant by ID.
 *
 * @param id - The tenant's string ID.
 * @returns  The tenant record.
 */
export async function getTenant(id: string): Promise<Tenant> {
  const envelope = await apiRequest<Envelope<Tenant>>(`/platform/tenants/${id}`);
  return envelope.data;
}

/**
 * Create a new tenant organisation.
 *
 * @param data - Org details and initial admin user info.
 * @returns    The new tenant plus a temp password for the admin.
 */
export async function createTenant(data: CreateTenantData): Promise<CreateTenantResponse> {
  const envelope = await apiRequest<Envelope<CreateTenantResponse>>('/platform/tenants', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return envelope.data;
}

/**
 * Update an existing tenant's name, status, or plan.
 *
 * @param id   - The tenant's string ID.
 * @param data - Fields to update.
 * @returns    The updated tenant record.
 */
export async function updateTenant(id: string, data: UpdateTenantData): Promise<Tenant> {
  const envelope = await apiRequest<Envelope<Tenant>>(`/platform/tenants/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  return envelope.data;
}

/**
 * Fetch all users belonging to a specific tenant.
 *
 * @param tenantId - The tenant's string ID.
 * @returns        Array of tenant user records.
 */
export async function getTenantUsers(tenantId: string): Promise<TenantUser[]> {
  const envelope = await apiRequest<Envelope<TenantUser[]>>(
    `/platform/tenants/${tenantId}/users`,
  );
  return envelope.data;
}

/**
 * Fetch usage statistics for a specific tenant.
 *
 * @param tenantId - The tenant's string ID.
 * @returns        Courses, questions, learners, and exam counts.
 */
export async function getTenantUsage(tenantId: string): Promise<TenantUsage> {
  const envelope = await apiRequest<Envelope<TenantUsage>>(
    `/platform/tenants/${tenantId}/usage`,
  );
  return envelope.data;
}

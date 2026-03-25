/** Platform-level types shared across the platform dashboard. */

export type TenantStatus = 'active' | 'trial' | 'suspended';
export type TenantPlan = 'starter' | 'growth' | 'enterprise';

/** A tenant (organisation) record returned by the platform API. */
export interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan: TenantPlan;
  status: TenantStatus;
  seats_purchased: number;
  seats_used: number;
  created_at: string;
  admin_email?: string | null;
}

/** Aggregated stats for the PlatformDashboardPage. */
export interface PlatformStats {
  total_orgs: number;
  active_orgs: number;
  total_users: number;
  total_seats_used: number;
}

/** Paginated tenants response. */
export interface TenantsPage {
  items: Tenant[];
  total: number;
  page: number;
  per_page: number;
}

/** Body sent to POST /platform/tenants. */
export interface CreateTenantData {
  name: string;
  slug: string;
  plan: TenantPlan;
  seats: number;
  admin_email: string;
  admin_first_name: string;
  admin_last_name: string;
}

/** Response from POST /platform/tenants — includes generated credentials. */
export interface CreateTenantResponse {
  tenant: Tenant;
  admin_email: string;
  admin_temp_password: string;
}

/** Fields that can be edited on an existing tenant. */
export interface UpdateTenantData {
  name?: string;
  status?: TenantStatus;
  plan?: TenantPlan;
}

/** A user inside a specific tenant, returned by GET /platform/tenants/:id/users. */
export interface TenantUser {
  id: string;
  email: string;
  first_name?: string | null;
  last_name?: string | null;
  roles: string[];
  is_active: boolean;
}

/** Usage stats for a specific tenant. */
export interface TenantUsage {
  courses_created: number;
  questions_created: number;
  active_learners: number;
  exams_taken: number;
}

/** Optional query params for listing tenants. */
export interface GetTenantsParams {
  page?: number;
  per_page?: number;
  search?: string;
  sort_by?: 'name' | 'created_at' | 'seats_used';
  sort_dir?: 'asc' | 'desc';
}

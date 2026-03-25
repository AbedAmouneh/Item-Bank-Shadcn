import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getPlatformStats,
  getTenants,
  getTenant,
  createTenant,
  updateTenant,
  getTenantUsers,
  getTenantUsage,
} from '@item-bank/api';
import type {
  CreateTenantData,
  UpdateTenantData,
  GetTenantsParams,
} from '@item-bank/types';

/** Query key constants — centralised to keep invalidation consistent. */
export const platformKeys = {
  stats: ['platform', 'stats'] as const,
  tenants: (params: GetTenantsParams) => ['platform', 'tenants', params] as const,
  tenant: (id: string) => ['platform', 'tenant', id] as const,
  tenantUsers: (id: string) => ['platform', 'tenant', id, 'users'] as const,
  tenantUsage: (id: string) => ['platform', 'tenant', id, 'usage'] as const,
};

/** Fetch aggregated platform stats for the dashboard. */
export function usePlatformStats() {
  return useQuery({
    queryKey: platformKeys.stats,
    queryFn: getPlatformStats,
  });
}

/** Fetch a paginated/searchable/sortable list of tenants. */
export function useTenants(params: GetTenantsParams = {}) {
  return useQuery({
    queryKey: platformKeys.tenants(params),
    queryFn: () => getTenants(params),
  });
}

/** Fetch a single tenant by ID. */
export function useTenant(id: string) {
  return useQuery({
    queryKey: platformKeys.tenant(id),
    queryFn: () => getTenant(id),
    enabled: !!id,
  });
}

/** Fetch all users belonging to a tenant. */
export function useTenantUsers(tenantId: string) {
  return useQuery({
    queryKey: platformKeys.tenantUsers(tenantId),
    queryFn: () => getTenantUsers(tenantId),
    enabled: !!tenantId,
  });
}

/** Fetch usage stats for a tenant. */
export function useTenantUsage(tenantId: string) {
  return useQuery({
    queryKey: platformKeys.tenantUsage(tenantId),
    queryFn: () => getTenantUsage(tenantId),
    enabled: !!tenantId,
  });
}

/** Create a new tenant and invalidate the tenants list on success. */
export function useCreateTenant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateTenantData) => createTenant(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['platform', 'tenants'] });
      void queryClient.invalidateQueries({ queryKey: platformKeys.stats });
    },
  });
}

/** Update an existing tenant and invalidate related queries on success. */
export function useUpdateTenant(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateTenantData) => updateTenant(id, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: platformKeys.tenant(id) });
      void queryClient.invalidateQueries({ queryKey: ['platform', 'tenants'] });
    },
  });
}

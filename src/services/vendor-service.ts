import { apiPost } from '@/lib/api-client';
import type { Page } from '@/types/social';
import type { AuditEntry, ModuleKey, Staff, VendorSummary } from '@/types/vendor';

/** Vendor portal and staff employment. None exist in the backend yet — all mocked (vendor.mocks.ts). */
export const VendorService = {
  summary: (token: string) => apiPost<VendorSummary>('/vendor/summary', undefined, token),
  setStoreOpen: (token: string, open: boolean) => apiPost<{ open: boolean }>('/vendor/store/toggle', { open }, token),

  team: (token: string) => apiPost<Staff[]>('/vendor/team', undefined, token),
  invite: (token: string, person: { userId: string; name: string; username: string }, module: ModuleKey, capabilities: string[]) =>
    apiPost<Staff>('/vendor/team/invite', { ...person, module, capabilities }, token),
  respond: (token: string, id: string, accept: boolean) => apiPost<{ message: string }>('/vendor/team/respond', { id, accept }, token),
  setCapabilities: (token: string, id: string, capabilities: string[]) =>
    apiPost<Staff>('/vendor/team/capabilities', { id, capabilities }, token),
  revoke: (token: string, id: string) =>
    apiPost<{ message: string; returnedOrders: number }>('/vendor/team/revoke', { id }, token),

  audit: (token: string, cursor?: string) => apiPost<Page<AuditEntry>>('/vendor/audit', { cursor }, token),
};

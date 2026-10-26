import { apiPost } from '@/lib/api-client';
import type { DeliveryJob, PartnerEarnings, PartnerHome } from '@/types/delivery';

/** Delivery partner jobs and earnings. Not in the backend yet — mocked (delivery.mocks.ts). */
export const DeliveryService = {
  home: (token: string) => apiPost<PartnerHome>('/delivery/home', undefined, token),
  setOnline: (token: string, online: boolean) => apiPost<{ online: boolean }>('/delivery/online', { online }, token),
  accept: (token: string, id: string) => apiPost<DeliveryJob>('/delivery/accept', { id }, token),
  pass: (token: string, id: string) => apiPost<{ message: string }>('/delivery/pass', { id }, token),
  /** Picked up → delivered. Delivering needs the customer's 4-digit code. */
  advance: (token: string, id: string, code?: string) => apiPost<DeliveryJob>('/delivery/advance', { id, code }, token),
  earnings: (token: string) => apiPost<PartnerEarnings>('/delivery/earnings', undefined, token),
};

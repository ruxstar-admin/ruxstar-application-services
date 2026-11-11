import { apiDelete, apiGet, apiPatch, apiPost, apiPostBytes, apiPut, newIdempotencyKey } from '@/lib/api-client';
import type { Business, BusinessModule, BusinessUpdate, ModuleChoice, Payments, PayoutMethod, PayoutMethodInput } from '@/types/business';

const path = (id: string) => `/v1/vendor/businesses/${encodeURIComponent(id)}`;

/** `/v1/vendor`: a verified person's businesses, one module each, and how they are paid. */
export const BusinessService = {
  modules: (token: string) => apiGet<ModuleChoice[]>('/v1/vendor/modules', token),
  list: (token: string) => apiGet<Business[]>('/v1/vendor/businesses', token),
  get: (token: string, id: string) => apiGet<Business>(path(id), token),

  /** Starts a draft. Pass the same key when retrying the same tap. */
  create: (token: string, module: BusinessModule, name: string, idempotencyKey = newIdempotencyKey()) =>
    apiPost<Business>('/v1/vendor/businesses', { module, name }, token, { idempotencyKey }),
  update: (token: string, id: string, changes: BusinessUpdate) => apiPatch<Business>(path(id), { ...changes }, token),
  /** A JPEG; the API keeps up to 3, the first being the cover. */
  addPhoto: (token: string, id: string, jpeg: Uint8Array<ArrayBuffer>) =>
    apiPostBytes<Business>(`${path(id)}/photos`, { data: jpeg, type: 'image/jpeg' }, token),
  removePhoto: (token: string, id: string, photoId: string) => apiDelete<Business>(`${path(id)}/photos/${encodeURIComponent(photoId)}`, token),
  publish: (token: string, id: string) => apiPost<Business>(`${path(id)}/publish`, undefined, token, { idempotencyKey: newIdempotencyKey() }),
  setOpen: (token: string, id: string, open: boolean) => apiPost<Business>(`${path(id)}/${open ? 'open' : 'close'}`, undefined, token),
  /** Drafts only. */
  remove: (token: string, id: string) => apiDelete<{ done: true }>(path(id), token),

  payments: (token: string) => apiGet<Payments>('/v1/vendor/payments', token),
  /** Checked with Cashfree; it must be in the name on the vendor's Aadhaar. */
  setPayoutMethod: (token: string, method: PayoutMethodInput) => apiPut<PayoutMethod | null>('/v1/vendor/payout-method', token, { ...method }),
};

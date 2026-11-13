import { apiDelete, apiGet, apiGetPage, apiPatch, apiPost, apiPostBytes, apiPut, newIdempotencyKey } from '@/lib/api-client';
import type {
  Business,
  BusinessCatalog,
  BusinessUpdate,
  NewBusiness,
  Payments,
  Payout,
  PayoutMethod,
  PayoutMethodInput,
  PodSetupUpdate,
  StatementLine,
} from '@/types/business';

const path = (id: string) => `/v1/vendor/businesses/${encodeURIComponent(id)}`;

/** `/v1/vendor`: a verified person's businesses, one module each, and how they are paid. */
export const BusinessService = {
  /** Categories with their types and module state, states and cities, print products. */
  catalog: (token: string) => apiGet<BusinessCatalog>('/v1/vendor/catalog', token),
  list: (token: string) => apiGet<Business[]>('/v1/vendor/businesses', token),
  get: (token: string, id: string) => apiGet<Business>(path(id), token),

  /** Starts a draft from its category, type and profile. Pass the same key when retrying the same tap. */
  create: (token: string, business: NewBusiness, idempotencyKey = newIdempotencyKey()) =>
    apiPost<Business>('/v1/vendor/businesses', { ...business }, token, { idempotencyKey }),
  update: (token: string, id: string, changes: BusinessUpdate) => apiPatch<Business>(path(id), { ...changes }, token),
  /** Print on demand: products, area and prices. */
  updatePod: (token: string, id: string, changes: PodSetupUpdate) => apiPatch<Business>(`${path(id)}/pod`, { ...changes }, token),
  /** A JPEG; the API keeps up to 3, the first being the cover. */
  addPhoto: (token: string, id: string, jpeg: Uint8Array<ArrayBuffer>) =>
    apiPostBytes<Business>(`${path(id)}/photos`, { data: jpeg, type: 'image/jpeg' }, token),
  removePhoto: (token: string, id: string, photoId: string) => apiDelete<Business>(`${path(id)}/photos/${encodeURIComponent(photoId)}`, token),
  publish: (token: string, id: string) => apiPost<Business>(`${path(id)}/publish`, undefined, token, { idempotencyKey: newIdempotencyKey() }),
  setOpen: (token: string, id: string, open: boolean) => apiPost<Business>(`${path(id)}/${open ? 'open' : 'close'}`, undefined, token),
  /** Drafts only. */
  remove: (token: string, id: string) => apiDelete<{ done: true }>(path(id), token),

  payments: (token: string) => apiGet<Payments>('/v1/vendor/payments', token),
  statement: (token: string, cursor?: string) => apiGetPage<StatementLine>('/v1/vendor/payments/statement', token, { cursor }),
  /** Everything available, less the fee, to the checked bank account or UPI ID. Pass the same key when retrying the same tap. */
  withdraw: (token: string, idempotencyKey = newIdempotencyKey()) => apiPost<Payout>('/v1/vendor/payouts', undefined, token, { idempotencyKey }),
  /** Checked with Cashfree; it must be in the name on the vendor's Aadhaar. */
  setPayoutMethod: (token: string, method: PayoutMethodInput) => apiPut<PayoutMethod | null>('/v1/vendor/payout-method', token, { ...method }),
};

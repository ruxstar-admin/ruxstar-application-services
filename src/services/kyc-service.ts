import { apiGet, apiPost, apiPostBytes } from '@/lib/api-client';
import type { KycOverview, RuxstarCard } from '@/types/kyc';

/** `/v1/kyc`. Every step answers with the whole overview, so the screen just replaces what it shows. */
export const KycService = {
  getOverview: (token: string) => apiGet<KycOverview>('/v1/kyc', token),

  /** A DigiLocker link to open in the browser. Starting again clears the PAN and selfie steps. */
  startAadhaar: (token: string) => apiPost<{ url: string }>('/v1/kyc/base/aadhaar', undefined, token),
  /** Safe to call repeatedly; the step stays `pending` until DigiLocker has the Aadhaar. */
  checkAadhaar: (token: string) => apiPost<KycOverview>('/v1/kyc/base/aadhaar/check', undefined, token),
  checkPan: (token: string, pan: string) => apiPost<KycOverview>('/v1/kyc/base/pan', { pan }, token),
  /** A JPEG taken just now with the front camera. Checked for liveness, matched, never stored. */
  sendSelfie: (token: string, jpeg: Uint8Array<ArrayBuffer>) =>
    apiPostBytes<KycOverview>('/v1/kyc/base/face', { data: jpeg, type: 'image/jpeg' }, token),
  submitIdentity: (token: string) => apiPost<KycOverview>('/v1/kyc/base/submit', undefined, token),

  getCard: (token: string) => apiGet<RuxstarCard>('/v1/kyc/card', token),
};

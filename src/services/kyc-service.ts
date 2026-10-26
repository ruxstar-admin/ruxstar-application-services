import { apiGet, apiPost } from '@/lib/api-client';
import type { KycFlow, KycOverview, KycUploadKind } from '@/types/kyc';

type Ok = { ok: boolean };

/** Identity verification endpoints. None exist in the backend yet — all mocked (kyc.mocks.ts). */
export const KycService = {
  getStatus: (token: string) => apiGet<KycOverview>('/kyc/status', token),

  aadhaarSendOtp: (token: string, aadhaar: string) =>
    apiPost<{ message: string; otp?: string }>('/kyc/aadhaar/send-otp', { aadhaar }, token),
  aadhaarVerifyOtp: (token: string, aadhaar: string, otp: string) => apiPost<Ok>('/kyc/aadhaar/verify-otp', { aadhaar, otp }, token),

  upload: (token: string, kind: KycUploadKind, uri: string) => apiPost<{ fileId: string }>('/kyc/upload', { kind, uri }, token),

  saveBank: (token: string, accountNumber: string, ifsc: string) =>
    apiPost<{ ok: boolean; last4: string }>('/kyc/bank', { accountNumber, ifsc }, token),
  saveBusinessId: (token: string, businessId: string) => apiPost<Ok>('/kyc/vendor/business-id', { businessId }, token),
  saveLicence: (token: string, licenceNumber: string) => apiPost<Ok>('/kyc/delivery/licence', { licenceNumber }, token),

  submit: (token: string, flow: KycFlow) => apiPost<{ status: string }>('/kyc/submit', { flow }, token),
};

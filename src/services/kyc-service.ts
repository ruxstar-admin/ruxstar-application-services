const BASE_URL = 'https://ruxstar-backend-services-391710984982.us-central1.run.app';

// ─── Types ────────────────────────────────────────────────────────────────────

export type KycOverallStatus = 'pending' | 'in_progress' | 'pending_review' | 'verified' | 'rejected';
export type KycStepStatus    = 'pending' | 'in_progress' | 'verified' | 'failed';

export interface KycStepInfo {
  status:    KycStepStatus;
  message?:  string;
  verifiedAt?: string;
}

export interface VendorKycStatus {
  status:   KycOverallStatus;
  aadhaar:  KycStepInfo;
  pan:      KycStepInfo;
  face:     KycStepInfo;
  message?: string;
}

export interface AadhaarStartResponse {
  url: string;
}

export interface KycMessageResponse {
  message?: string;
  success?: boolean;
}

// ─── HTTP helpers ─────────────────────────────────────────────────────────────

async function get<T>(path: string, token: string): Promise<T> {
  const res = await fetch(`${BASE_URL}/${path}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message ?? data.error ?? `Request failed (${res.status})`);
  }
  return data as T;
}

async function post<T>(path: string, body: unknown, token: string): Promise<T> {
  const res = await fetch(`${BASE_URL}/${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message ?? data.error ?? `Request failed (${res.status})`);
  }
  return data as T;
}

// ─── Response normaliser ──────────────────────────────────────────────────────

function defaultStep(overrides?: Partial<KycStepInfo>): KycStepInfo {
  return { status: 'pending', ...overrides };
}

export function normalizeVendorKycStatus(raw: unknown): VendorKycStatus {
  const d = (raw ?? {}) as Record<string, unknown>;
  return {
    status:  (d.status as KycOverallStatus) ?? 'pending',
    message: (d.message as string) ?? undefined,
    aadhaar: { ...defaultStep(), ...((d.aadhaar ?? d.digilocker) as object) },
    pan:     { ...defaultStep(), ...(d.pan as object) },
    face:    { ...defaultStep(), ...((d.face ?? d.selfie) as object) },
  };
}

/** Returns which step the vendor should be on right now. */
export function nextKycStep(s: VendorKycStatus): 'aadhaar' | 'pan' | 'face' | 'pending_review' | 'verified' | 'rejected' {
  if (s.status === 'verified')       return 'verified';
  if (s.status === 'pending_review') return 'pending_review';
  if (s.status === 'rejected')       return 'rejected';

  if (s.aadhaar.status !== 'verified') return 'aadhaar';
  if (s.pan.status     !== 'verified') return 'pan';
  if (s.face.status    !== 'verified') return 'face';

  return 'pending_review';
}

// ─── KYC Service ─────────────────────────────────────────────────────────────

export const KycService = {
  /** GET /vendor/kyc/status */
  getStatus(token: string) {
    return get<VendorKycStatus>('vendor/kyc/status', token).then(normalizeVendorKycStatus);
  },

  /** POST /vendor/kyc/aadhaar/start → returns DigiLocker redirect URL */
  startAadhaar(token: string, redirectUrl: string) {
    return post<AadhaarStartResponse>('vendor/kyc/aadhaar/start', { redirectUrl, userFlow: 'signin' }, token);
  },

  /** GET /vendor/kyc/aadhaar/sync — call after DigiLocker deep-link return */
  syncAadhaar(token: string) {
    return get<KycMessageResponse>('vendor/kyc/aadhaar/sync', token);
  },

  /** POST /vendor/kyc/pan */
  submitPan(token: string, pan: string) {
    return post<KycMessageResponse>('vendor/kyc/pan', { pan }, token);
  },

  /** POST /vendor/kyc/face — raw base64 JPEG, no data-URL prefix */
  submitFace(token: string, base64Image: string) {
    return post<KycMessageResponse>('vendor/kyc/face', { image: base64Image }, token);
  },
};

import { API_URL } from '@/constants/config';

const BASE_URL = API_URL;

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

export interface RuxstarCardData {
  ruxstarId:   string;
  name:        string | null;
  mobile:      string | null;
  aadhaar:     string | null;
  pan:         string | null;
  memberSince: string | null;
}

// ─── HTTP helpers ─────────────────────────────────────────────────────────────

async function get<T>(path: string, token: string): Promise<T> {
  console.log(`[KycService] GET /${path}`);
  const res = await fetch(`${BASE_URL}/${path}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await res.json().catch(() => ({}));
  console.log(`[KycService] GET /${path} → ${res.status}`, JSON.stringify(data));

  if (!res.ok) {
    throw new Error(data.message ?? data.error ?? `Request failed (${res.status})`);
  }
  return data as T;
}

async function post<T>(path: string, body: unknown, token: string): Promise<T> {
  console.log(`[KycService] POST /${path}`, JSON.stringify(body));
  const res = await fetch(`${BASE_URL}/${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));
  console.log(`[KycService] POST /${path} → ${res.status}`, JSON.stringify(data));

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

  // ✅ FIX: Backend wraps the payload as { kyc: { status, aadhaar, pan, face } }.
  // Without this unwrap, every field reads as undefined → always returns "pending".
  const src = (d.kyc && typeof d.kyc === 'object'
    ? d.kyc
    : d) as Record<string, unknown>;

  console.log('[KycService] normalizeVendorKycStatus — raw envelope keys:', Object.keys(d));
  console.log('[KycService] normalizeVendorKycStatus — src (unwrapped):', JSON.stringify(src));

  const normalized: VendorKycStatus = {
    status:  (src.status as KycOverallStatus) ?? 'pending',
    message: (src.message as string) ?? undefined,
    aadhaar: { ...defaultStep(), ...((src.aadhaar ?? src.digilocker) as object) },
    pan:     { ...defaultStep(), ...(src.pan as object) },
    face:    { ...defaultStep(), ...((src.face ?? src.selfie) as object) },
  };

  console.log('[KycService] normalizeVendorKycStatus — result:', JSON.stringify(normalized));
  return normalized;
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
    console.log('[KycService] getStatus called');
    return get<VendorKycStatus>('vendor/kyc/status', token).then(normalizeVendorKycStatus);
  },

  /** POST /vendor/kyc/aadhaar/start → returns DigiLocker redirect URL */
  startAadhaar(token: string, redirectUrl: string) {
    console.log('[KycService] startAadhaar — redirectUrl:', redirectUrl);
    return post<AadhaarStartResponse>('vendor/kyc/aadhaar/start', { redirectUrl, userFlow: 'signin' }, token);
  },

  /** GET /vendor/kyc/aadhaar/sync — call after DigiLocker deep-link return */
  syncAadhaar(token: string) {
    console.log('[KycService] syncAadhaar called');
    return get<KycMessageResponse>('vendor/kyc/aadhaar/sync', token);
  },

  /** POST /vendor/kyc/pan */
  submitPan(token: string, pan: string) {
    console.log('[KycService] submitPan — pan:', pan);
    return post<KycMessageResponse>('vendor/kyc/pan', { pan }, token);
  },

  /** POST /vendor/kyc/face — raw base64 JPEG, no data-URL prefix */
  submitFace(token: string, base64Image: string) {
    console.log('[KycService] submitFace — image length:', base64Image.length);
    return post<KycMessageResponse>('vendor/kyc/face', { image: base64Image }, token);
  },

  /** GET /vendor/card — returns Ruxstar Card data (only available when KYC verified) */
  async getCard(token: string): Promise<RuxstarCardData> {
    console.log('[KycService] getCard called');
    const data = await get<Record<string, unknown>>('vendor/card', token);
    const card = (data?.card && typeof data.card === 'object')
      ? data.card as Record<string, unknown>
      : data;
    return {
      ruxstarId:   typeof card.ruxstarId   === 'string' ? card.ruxstarId   : 'RUX-0000-0000',
      name:        typeof card.name        === 'string' ? card.name        : null,
      mobile:      typeof card.mobile      === 'string' ? card.mobile      : null,
      aadhaar:     typeof card.aadhaar     === 'string' ? card.aadhaar     : null,
      pan:         typeof card.pan         === 'string' ? card.pan         : null,
      memberSince: typeof card.memberSince === 'string' ? card.memberSince : null,
    };
  },
};

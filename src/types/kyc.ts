export type KycFlow = 'base' | 'vendor' | 'delivery';

/** `verified` is set by an admin approval; `pending_review` while it waits. */
export type KycStatus = 'not_started' | 'pending_review' | 'verified' | 'rejected';

export interface KycState {
  status: KycStatus;
  /** Shown to the user when `status` is `rejected`. */
  reason?: string;
}

export type KycOverview = Record<KycFlow, KycState>;

export type KycUploadKind = 'pan' | 'selfie' | 'shop' | 'licence' | 'vehicle';

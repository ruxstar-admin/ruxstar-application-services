/** `locked` follows the third rejection; support reopens it. */
export type KycCaseStatus = 'not_started' | 'in_progress' | 'submitted' | 'approved' | 'rejected' | 'locked';
export type KycStepStatus = 'not_started' | 'pending' | 'verified' | 'failed';

interface Step {
  status: KycStepStatus;
  /** Why it failed, in words for the user. */
  reason: string | null;
}

interface Decision {
  status: KycCaseStatus;
  rejectionReason: string | null;
  rejectionsLeft: number;
  submittedAt: string | null;
  decidedAt: string | null;
}

/** Identity: Aadhaar through DigiLocker, PAN matched to its name, then a live selfie matched to its photo. */
export interface BaseCase extends Decision {
  steps: {
    aadhaar: Step & { name: string | null; last4: string | null };
    pan: Step & { masked: string | null };
    face: Step;
  };
}

/** GET /v1/kyc */
export interface KycOverview {
  base: BaseCase;
}

/** Issued when identity is approved, which also makes the person a vendor. The masked numbers are for the owner only. */
export interface RuxstarCard {
  id: string;
  name: string;
  photoUrl: string | null;
  aadhaar: string;
  pan: string | null;
  vendor: boolean;
  memberSince: string;
  /** The public profile, for the QR code. */
  profileUrl: string;
}

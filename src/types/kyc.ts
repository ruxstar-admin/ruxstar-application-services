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

export interface KycAddress {
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  pincode: string;
}

export interface KycBusiness {
  name: string;
  address: KycAddress;
  gstin: { number: string; legalName: string | null; status: string | null } | null;
}

/** Identity: Aadhaar through DigiLocker, PAN matched to its name, then a live selfie matched to its photo. */
export interface BaseCase extends Decision {
  steps: {
    aadhaar: Step & { name: string | null; last4: string | null };
    pan: Step & { masked: string | null };
    face: Step;
  };
}

export interface VendorCase extends Decision {
  business: KycBusiness | null;
}

/** GET /v1/kyc */
export interface KycOverview {
  base: BaseCase;
  vendor: VendorCase;
}

export interface VendorDetails {
  businessName: string;
  address: KycAddress;
  gstin: string | null;
}

/** Issued when identity is approved. The masked numbers are for the owner only. */
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

/** The modules a business can be opened in. Each business is in exactly one. */
export type BusinessModule = 'pod' | 'events' | 'coaching' | 'stays';

export interface Address {
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  pincode: string;
}

export interface Gstin {
  number: string;
  legalName: string | null;
  status: string | null;
}

export interface BusinessPhoto {
  id: string;
  url: string;
  width: number;
  height: number;
}

/** What is still needed before a draft can be published. */
export type BusinessMissing = 'description' | 'phone' | 'address' | 'photo';

/** GET /v1/vendor/businesses/{id} */
export interface Business {
  id: string;
  module: BusinessModule;
  name: string;
  description: string | null;
  phone: string | null;
  email: string | null;
  address: Address | null;
  gstin: Gstin | null;
  /** The first is the cover. */
  photos: BusinessPhoto[];
  status: 'draft' | 'live';
  /** A live business takes orders and bookings only while open. */
  open: boolean;
  /** False while the Ruxstar team has paused this module. */
  moduleLive: boolean;
  missing: BusinessMissing[];
  /** Set while the Ruxstar team has the business on hold. */
  suspension: { reason: string; at: string } | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Send only what changes; null clears an optional field. */
export interface BusinessUpdate {
  name?: string;
  description?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: Address | null;
  gstin?: string | null;
}

export interface ModuleChoice {
  module: BusinessModule;
  live: boolean;
  /** Whether new businesses can be created in it. */
  signupsOpen: boolean;
}

export interface PayoutMethod {
  kind: 'bank' | 'upi';
  /** For example "YES BANK ••1191" or "asha@upi". */
  label: string;
  /** The name the bank has for the account. */
  holderName: string | null;
  ifsc: string | null;
  verifiedAt: string;
}

export type PayoutMethodInput = { kind: 'bank'; accountNumber: string; ifsc: string } | { kind: 'upi'; vpa: string };

export interface Payout {
  id: string;
  /** Paise. */
  amount: number;
  status: 'pending' | 'paid' | 'failed';
  to: string;
  utr: string | null;
  paidAt: string | null;
  createdAt: string;
}

/** GET /v1/vendor/payments. Amounts are paise. */
export interface Payments {
  balance: { available: number; pending: number; paidOut: number };
  payoutMethod: PayoutMethod | null;
  payouts: Payout[];
}

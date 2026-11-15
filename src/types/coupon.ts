/** Who pays for the discount: Ruxstar, or the vendor out of their share. */
export type CouponFunder = 'ruxstar' | 'vendor';
export type CouponKind = 'percent' | 'flat';
/** `scheduled` hasn't started, `ended` is past its end date, `used_up` reached its limit, `off` is switched off. */
export type CouponState = 'active' | 'scheduled' | 'ended' | 'used_up' | 'off';

/** A coupon as its owner (the Ruxstar team or the vendor) manages it. Amounts in paise. */
export interface ManagedCoupon {
  id: string;
  code: string;
  fundedBy: CouponFunder;
  vendor: { id: string; name: string } | null;
  /** The vendor's shops it works at; empty for Ruxstar's, which work at every shop. */
  businesses: { id: string; name: string }[];
  modules: string[];
  /** `percent`: `value` percent off up to `cap`. `flat`: `value` paise off. */
  kind: CouponKind;
  value: number;
  cap: number | null;
  /** "20% off up to ₹100" */
  label: string;
  minOrder: number;
  startsAt: string | null;
  endsAt: string | null;
  limit: number | null;
  perCustomer: number | null;
  firstOrderOnly: boolean;
  /** Shown in the offers at checkout. */
  listed: boolean;
  active: boolean;
  /** Ruxstar switched this vendor coupon off; only Ruxstar can switch it back on. */
  stoppedByRuxstar: boolean;
  used: number;
  state: CouponState;
  createdAt: string;
  updatedAt: string;
}

/** What can change after a coupon is made. Send only what changes. */
export interface CouponTerms {
  minOrder?: number;
  startsAt?: string | null;
  endsAt?: string | null;
  limit?: number | null;
  perCustomer?: number | null;
  firstOrderOnly?: boolean;
  listed?: boolean;
}

/** What a Ruxstar coupon can work on. */
export type CouponModule = 'pod' | 'events' | 'coaching' | 'turf' | 'stays';

export interface NewCoupon extends CouponTerms {
  code: string;
  kind: CouponKind;
  value: number;
  cap?: number | null;
  /** Vendors only: their businesses it works at. */
  businessIds?: string[];
  /** Ruxstar only: what it works on, print only when left out. It can't change later. */
  modules?: CouponModule[];
}

export interface CouponPatch extends CouponTerms {
  active?: boolean;
  businessIds?: string[];
}

/** A coupon a customer can pick at checkout. */
export interface CouponOffer {
  code: string;
  fundedBy: CouponFunder;
  label: string;
  /** "On items of ₹200 or more · First order only · Ends 30 Nov" */
  terms: string | null;
  /** Paise off this order; 0 while it doesn't apply. */
  discount: number;
  /** Why it doesn't apply yet, such as "Add ₹50 more to use this." */
  problem: string | null;
}

/** The coupon on an order or a quote. `label` is "Ruxstar offer" or "Shop offer". */
export interface AppliedCoupon {
  code: string;
  fundedBy: CouponFunder;
  label: string;
}

/** Coupons that work on an order, best first, and `checked`: the code asked about, if any. */
export interface CouponCheck {
  offers: CouponOffer[];
  checked: { code: string; discount: number; problem: string | null } | null;
}

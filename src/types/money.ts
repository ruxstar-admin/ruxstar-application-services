import type { ModuleKey } from './vendor';

export type CouponFunder = 'ruxstar' | 'vendor';

/** `pending` until the order completes or 7 days pass; `available` once eligible; `refunded` if cancelled. */
export type LedgerStatus = 'pending' | 'available' | 'refunded';

export interface LedgerEntry {
  id: string;
  refId: string;
  module: ModuleKey;
  title: string;
  /** Item total before any coupon, excluding delivery fee. Rupees. */
  gross: number;
  /** Coupon discount the customer received. */
  discount: number;
  fundedBy?: CouponFunder;
  /** Ruxstar's commission on the item total. */
  commission: number;
  /** Paid to the rider from the delivery fee, not to the vendor. */
  deliveryFee: number;
  /** What the vendor receives: gross − commission − vendor-funded discount. */
  vendorNet: number;
  status: LedgerStatus;
  createdAt: string;
  /** When the entry becomes available: completion, or 7 days after payment, whichever is first. */
  eligibleAt: string;
}

export interface EarningsSummary {
  total: number;
  pending: number;
  withdrawable: number;
  withdrawn: number;
  /** ISO date of the next weekly settlement run. */
  nextSettlement: string;
}

export type PayoutKind = 'bank' | 'upi';

export interface PayoutAccount {
  id: string;
  kind: PayoutKind;
  /** "HDFC ending 5678" or the UPI id. */
  label: string;
  verified: boolean;
}

export interface Withdrawal {
  id: string;
  amount: number;
  accountLabel: string;
  status: 'processing' | 'paid';
  createdAt: string;
}

export interface Coupon {
  code: string;
  /** Percent off the item total. */
  percent: number;
  /** Maximum rupees off. */
  cap: number;
  fundedBy: CouponFunder;
  module?: ModuleKey;
  active: boolean;
}

export interface CouponCheck {
  code: string;
  discount: number;
  fundedBy: CouponFunder;
}

export interface CancelResult {
  /** Rupees returned to the customer's original payment method. */
  refunded: number;
  message: string;
}

export interface CancelQuote {
  allowed: boolean;
  refundable: number;
  /** Plain-language outcome shown before the user confirms. */
  summary: string;
}

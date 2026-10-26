import type { CouponCheck, CouponFunder, LedgerStatus } from '@/types/money';
import type { ModuleKey } from '@/types/vendor';

const DAY_MS = 86_400_000;

/** Ruxstar's commission per module, as a fraction of the item total (deducted at settlement, not at order time). */
export const COMMISSION_RATE: Record<ModuleKey, number> = { pod: 0.08, events: 0.1, coaching: 0.12, pg: 0.06 };

/** Money stays pending for at most this long after payment (scope review #6). */
export const PENDING_DAYS = 7;

export const MIN_WITHDRAWAL = 100;

export const commissionFor = (module: ModuleKey, gross: number) => Math.round(gross * COMMISSION_RATE[module]);

/**
 * Vendor net = item total − commission − any discount the VENDOR funded. A Ruxstar-funded coupon never
 * reduces the vendor's net. Never negative.
 */
export const vendorNetFor = (gross: number, commission: number, discount: number, fundedBy?: CouponFunder) =>
  Math.max(0, gross - commission - (fundedBy === 'vendor' ? discount : 0));

/** Percent coupon with a cap, on the item total; never more than the total itself. */
export const discountFor = (percent: number, cap: number, itemTotal: number) =>
  Math.min(itemTotal, cap, Math.floor((itemTotal * percent) / 100));

/** The moment an entry stops being pending: when the order completes, or 7 days after payment, whichever is first. */
export const eligibleAt = (paidAt: string, completedAt?: string): string => {
  const sevenDays = new Date(paidAt).getTime() + PENDING_DAYS * DAY_MS;
  const completed = completedAt ? new Date(completedAt).getTime() : Infinity;
  return new Date(Math.min(sevenDays, completed)).toISOString();
};

export const ledgerStatus = (entry: { refunded: boolean; eligibleAt: string }, now: number = Date.now()): LedgerStatus => {
  if (entry.refunded) return 'refunded';
  return new Date(entry.eligibleAt).getTime() <= now ? 'available' : 'pending';
};

/** The Monday on or after `from`, as an ISO date — the weekly payout run. */
export const nextSettlement = (from: Date = new Date()): string => {
  const day = from.getDay();
  const add = day === 1 ? 7 : (8 - day) % 7 || 7;
  const next = new Date(from.getFullYear(), from.getMonth(), from.getDate() + add);
  return next.toISOString();
};

export const couponLabel = (coupon: Pick<CouponCheck, 'fundedBy'>) => (coupon.fundedBy === 'ruxstar' ? 'Ruxstar offer' : 'Store offer');

/**
 * What a customer cancelling gets back. Inside the window a cancel refunds in full with no approval; once an
 * order has completed there is nothing to cancel. Coaching is the exception: after the first session a dropout
 * is not refunded (scope review #7).
 */
export const refundFor = (opts: {
  module: ModuleKey;
  paid: number;
  completed: boolean;
  paidAt: string;
  /** Coaching only: whether the first session has started. */
  firstSessionStarted?: boolean;
  now?: number;
}): { allowed: boolean; refund: number; reason: string } => {
  const now = opts.now ?? Date.now();
  if (opts.completed) return { allowed: false, refund: 0, reason: 'This order is already complete.' };
  if (opts.paid === 0) return { allowed: true, refund: 0, reason: 'This will be cancelled. Nothing was charged.' };
  if (opts.module === 'coaching' && opts.firstSessionStarted) {
    return { allowed: true, refund: 0, reason: 'The first session has started, so dropping out is not refunded.' };
  }
  const withinWindow = now - new Date(opts.paidAt).getTime() <= PENDING_DAYS * DAY_MS;
  if (!withinWindow) return { allowed: false, refund: 0, reason: 'The 7-day cancellation window has passed. Contact support for help.' };
  return { allowed: true, refund: opts.paid, reason: 'You get a full refund to the original payment method.' };
};

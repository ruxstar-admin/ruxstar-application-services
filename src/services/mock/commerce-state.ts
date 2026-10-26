import { commissionFor, eligibleAt, ledgerStatus, nextSettlement, vendorNetFor } from '@/features/money/lib/rules';
import type { Engagement, Listing } from '@/types/commerce';
import type { Coupon, CouponFunder, EarningsSummary, LedgerEntry, PayoutAccount, Withdrawal } from '@/types/money';
import type { ModuleKey } from '@/types/vendor';

/**
 * Shared in-memory state behind the commerce mocks: purchases, payments, the ledger and payouts.
 * Module mocks write purchases here; the money mocks read and settle them. The real backend owns all of this.
 */

export interface PaymentRecord {
  /** Paid now, after the coupon. */
  paid: number;
  /** Item total before the coupon, excluding delivery. */
  itemTotal: number;
  /** Everything the lines added up to, before the coupon (item total + delivery fee). */
  total: number;
  discount: number;
  fundedBy?: CouponFunder;
  couponCode?: string;
}

interface StoredLedger extends Omit<LedgerEntry, 'status'> {
  refunded: boolean;
}

export const engagements: Engagement[] = [];
export const payments = new Map<string, PaymentRecord>();
let ledger: StoredLedger[] = [];
const listingSources: (() => Listing[])[] = [];

export interface CancelContext {
  completed: boolean;
  /** Coaching only. */
  firstSessionStarted?: boolean;
  /** Performs the module-side cancellation (free the seat, mark the order cancelled). */
  apply: () => void;
}
const cancellers = new Map<ModuleKey, (refId: string) => CancelContext>();
export const registerCanceller = (module: ModuleKey, canceller: (refId: string) => CancelContext) => cancellers.set(module, canceller);
export const cancellerFor = (module: ModuleKey) => cancellers.get(module);

export const registerListings = (source: () => Listing[]) => {
  listingSources.push(source);
};
export const allListings = () => listingSources.flatMap((source) => source());

/** Called by a module mock when a purchase/booking is created. A payment reference links it to the ledger. */
export const recordEngagement = (entry: Omit<Engagement, 'id' | 'createdAt'> & { paymentRef?: string }): Engagement => {
  const { paymentRef, ...rest } = entry;
  const payment = paymentRef ? payments.get(paymentRef) : undefined;
  const now = new Date().toISOString();
  const created: Engagement = { ...rest, amount: payment?.paid ?? rest.amount, id: `eng-${engagements.length + 1}`, createdAt: now };
  engagements.unshift(created);

  if (payment) {
    const commission = commissionFor(entry.module, payment.itemTotal);
    ledger = [
      {
        id: `led-${ledger.length + 1}`,
        refId: entry.refId,
        module: entry.module,
        title: entry.title,
        gross: payment.itemTotal,
        discount: payment.discount,
        fundedBy: payment.fundedBy,
        commission,
        deliveryFee: Math.max(0, payment.total - payment.itemTotal),
        vendorNet: vendorNetFor(payment.itemTotal, commission, payment.discount, payment.fundedBy),
        refunded: false,
        createdAt: now,
        eligibleAt: eligibleAt(now),
      },
      ...ledger,
    ];
  }
  return created;
};

export const updateEngagement = (refId: string, changes: Partial<Pick<Engagement, 'status' | 'subtitle'>>) => {
  const found = engagements.find((e) => e.refId === refId);
  if (found) Object.assign(found, changes);
  // Completion makes the money eligible straight away (it is pending until completion or 7 days).
  if (changes.status === 'completed') {
    ledger = ledger.map((l) => (l.refId === refId ? { ...l, eligibleAt: eligibleAt(l.createdAt, new Date().toISOString()) } : l));
  }
};

export const markRefunded = (refId: string) => {
  ledger = ledger.map((l) => (l.refId === refId ? { ...l, refunded: true } : l));
};

export const ledgerEntries = (now: number = Date.now()): LedgerEntry[] =>
  ledger.map(({ refunded, ...entry }) => ({ ...entry, status: ledgerStatus({ refunded, eligibleAt: entry.eligibleAt }, now) }));

// ---------------------------------------------------------------- payouts

export const payoutAccounts: PayoutAccount[] = [{ id: 'pa-bank', kind: 'bank', label: 'HDFC ending 5678', verified: true }];
export let withdrawals: Withdrawal[] = [
  { id: 'wd-1', amount: 20_000, accountLabel: 'HDFC ending 5678', status: 'paid', createdAt: new Date(Date.now() - 40 * 86_400_000).toISOString() },
  { id: 'wd-2', amount: 15_800, accountLabel: 'HDFC ending 5678', status: 'paid', createdAt: new Date(Date.now() - 12 * 86_400_000).toISOString() },
];
export const addWithdrawal = (withdrawal: Withdrawal) => {
  withdrawals = [withdrawal, ...withdrawals];
};

// Earlier, already-settled sales so a new vendor account does not start from zero in the demo.
const seedSale = (title: string, module: ModuleKey, gross: number, daysAgo: number) => {
  const created = new Date(Date.now() - daysAgo * 86_400_000).toISOString();
  const commission = commissionFor(module, gross);
  ledger.push({
    id: `led-seed-${ledger.length + 1}`,
    refId: `seed-${ledger.length + 1}`,
    module,
    title,
    gross,
    discount: 0,
    commission,
    deliveryFee: 0,
    vendorNet: vendorNetFor(gross, commission, 0),
    refunded: false,
    createdAt: created,
    eligibleAt: eligibleAt(created, created),
  });
};
seedSale('Print orders, September', 'pod', 31_000, 40);
seedSale('Open mic night tickets', 'events', 8_000, 30);
seedSale('Pottery batch 3', 'coaching', 6_400, 20);
seedSale('Print orders, early October', 'pod', 9_400, 9);

export const earningsSummary = (now: number = Date.now()): EarningsSummary => {
  const entries = ledgerEntries(now).filter((e) => e.status !== 'refunded');
  const sum = (status: 'pending' | 'available') => entries.filter((e) => e.status === status).reduce((total, e) => total + e.vendorNet, 0);
  const withdrawn = withdrawals.reduce((total, w) => total + w.amount, 0);
  return {
    total: entries.reduce((total, e) => total + e.vendorNet, 0),
    pending: sum('pending'),
    withdrawable: Math.max(0, sum('available') - withdrawn),
    withdrawn,
    nextSettlement: nextSettlement(new Date(now)),
  };
};

// ---------------------------------------------------------------- coupons

/** Ruxstar-funded coupons are paid by Ruxstar; vendor-funded ones by the vendor (scope review #6). */
export let coupons: Coupon[] = [
  { code: 'WELCOME50', percent: 50, cap: 100, fundedBy: 'ruxstar', active: true },
  { code: 'FLEX10', percent: 10, cap: 200, fundedBy: 'vendor', module: 'pod', active: true },
];
export const addCoupon = (coupon: Coupon) => {
  coupons = [coupon, ...coupons];
};
export const setCouponActive = (code: string, active: boolean) => {
  coupons = coupons.map((c) => (c.code === code ? { ...c, active } : c));
};

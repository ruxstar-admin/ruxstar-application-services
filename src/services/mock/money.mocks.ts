import { ApiError } from '@/lib/api-error';
import { MIN_WITHDRAWAL, refundFor } from '@/features/money/lib/rules';
import { formatRupees } from '@/lib/money';
import type { Page } from '@/types/social';
import type { CancelQuote, CancelResult, Coupon, LedgerEntry } from '@/types/money';
import type { ModuleKey } from '@/types/vendor';
import { resolveCoupon } from './commerce.mocks';
import {
  addCoupon,
  addWithdrawal,
  cancellerFor,
  coupons,
  earningsSummary,
  engagements,
  ledgerEntries,
  markRefunded,
  payoutAccounts,
  setCouponActive,
  withdrawals,
} from './commerce-state';
import { defineMocks } from './registry';

const PAGE_SIZE = 15;
const text = (body: Record<string, unknown> | undefined, key: string) => String(body?.[key] ?? '');

/** Works out what cancelling would do, without doing it. Throws 404/409 when there is nothing to cancel. */
const assess = (refId: string) => {
  const engagement = engagements.find((e) => e.refId === refId);
  if (!engagement) throw new ApiError(404, 'Order not found');
  if (engagement.status === 'cancelled') throw new ApiError(409, 'Already cancelled');
  const canceller = cancellerFor(engagement.module);
  if (!canceller) throw new ApiError(409, 'This cannot be cancelled');
  const context = canceller(refId);
  const outcome = refundFor({
    module: engagement.module,
    paid: engagement.amount,
    completed: context.completed,
    firstSessionStarted: context.firstSessionStarted,
    paidAt: engagement.createdAt,
  });
  return { engagement, context, outcome };
};

defineMocks({
  'POST /vendor/earnings': { mocked: true, handle: () => earningsSummary() },

  'POST /vendor/ledger': {
    mocked: true,
    handle: ({ body }): Page<LedgerEntry> => {
      const start = body?.cursor ? Number(body.cursor) : 0;
      const all = ledgerEntries();
      return { items: all.slice(start, start + PAGE_SIZE), nextCursor: start + PAGE_SIZE < all.length ? String(start + PAGE_SIZE) : null };
    },
  },

  'POST /payouts/list': { mocked: true, handle: () => payoutAccounts.map((a) => ({ ...a })) },

  /** Penny-drop style check: a UPI id needs an "@" handle, and "@fail" simulates one that cannot be verified. */
  'POST /payouts/add-upi': {
    mocked: true,
    latencyMs: 700,
    handle: ({ body }) => {
      const upi = text(body, 'upi').trim().toLowerCase();
      if (!/^[a-z0-9._-]{2,}@[a-z]{2,}$/.test(upi) || upi.endsWith('@fail')) throw new ApiError(400, 'UPI id could not be verified');
      if (payoutAccounts.some((a) => a.label === upi)) throw new ApiError(409, 'Already added');
      const account = { id: `pa-${payoutAccounts.length + 1}`, kind: 'upi' as const, label: upi, verified: true };
      payoutAccounts.push(account);
      return { ...account };
    },
  },

  'POST /payouts/withdraw': {
    mocked: true,
    latencyMs: 600,
    handle: ({ body }) => {
      const account = payoutAccounts.find((a) => a.id === text(body, 'accountId'));
      if (!account || !account.verified) throw new ApiError(403, 'Choose a verified account');
      const amount = Math.floor(Number(body?.amount ?? 0));
      if (amount < MIN_WITHDRAWAL) throw new ApiError(400, `Minimum withdrawal is ${formatRupees(MIN_WITHDRAWAL)}`);
      if (amount > earningsSummary().withdrawable) throw new ApiError(409, 'More than your withdrawable balance');
      const withdrawal = { id: `wd-${withdrawals.length + 1}`, amount, accountLabel: account.label, status: 'processing' as const, createdAt: new Date().toISOString() };
      addWithdrawal(withdrawal);
      return { ...withdrawal };
    },
  },

  'POST /payouts/withdrawals': { mocked: true, handle: () => withdrawals.map((w) => ({ ...w })) },

  'POST /coupons/validate': {
    mocked: true,
    latencyMs: 300,
    handle: ({ body }) => resolveCoupon(text(body, 'code'), (text(body, 'module') || undefined) as ModuleKey | undefined, Number(body?.itemTotal ?? 0)),
  },

  'POST /vendor/coupons': { mocked: true, handle: () => coupons.filter((c) => c.fundedBy === 'vendor').map((c) => ({ ...c })) },

  'POST /vendor/coupons/create': {
    mocked: true,
    handle: ({ body }) => {
      const code = text(body, 'code').trim().toUpperCase();
      const percent = Number(body?.percent ?? 0);
      const cap = Number(body?.cap ?? 0);
      if (!/^[A-Z0-9]{4,12}$/.test(code)) throw new ApiError(400, 'Code must be 4 to 12 letters or numbers');
      if (percent < 1 || percent > 90 || cap < 1) throw new ApiError(400, 'Percent must be 1 to 90 and cap at least 1');
      if (coupons.some((c) => c.code === code)) throw new ApiError(409, 'Code already exists');
      const coupon: Coupon = { code, percent, cap, fundedBy: 'vendor', active: true, module: (text(body, 'module') || undefined) as ModuleKey | undefined };
      addCoupon(coupon);
      return { ...coupon };
    },
  },

  'POST /vendor/coupons/toggle': {
    mocked: true,
    handle: ({ body }) => {
      const code = text(body, 'code');
      if (!coupons.some((c) => c.code === code && c.fundedBy === 'vendor')) throw new ApiError(404, 'Coupon not found');
      setCouponActive(code, body?.active === true);
      return { message: 'Updated' };
    },
  },

  'POST /orders/cancel-quote': {
    mocked: true,
    handle: ({ body }): CancelQuote => {
      const { outcome } = assess(text(body, 'refId'));
      return { allowed: outcome.allowed, refundable: outcome.refund, summary: outcome.allowed && outcome.refund > 0 ? `${outcome.reason} (${formatRupees(outcome.refund)})` : outcome.reason };
    },
  },

  /** Inside the window a cancel refunds in full with no approval (scope review #6). */
  'POST /orders/cancel': {
    mocked: true,
    latencyMs: 600,
    handle: ({ body }): CancelResult => {
      const refId = text(body, 'refId');
      const { engagement, context, outcome } = assess(refId);
      if (!outcome.allowed) throw new ApiError(409, outcome.reason);
      context.apply();
      engagement.status = 'cancelled';
      engagement.subtitle = outcome.refund > 0 ? `Refunded ${formatRupees(outcome.refund)}` : 'Cancelled';
      if (outcome.refund > 0) markRefunded(refId);
      return { refunded: outcome.refund, message: outcome.refund > 0 ? `${formatRupees(outcome.refund)} is on its way back to you.` : 'Cancelled.' };
    },
  },
});

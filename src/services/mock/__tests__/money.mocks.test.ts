import { findMock, runMock } from '..';
import type { Engagement } from '@/types/commerce';
import type { CancelQuote, CancelResult, CouponCheck, EarningsSummary, LedgerEntry } from '@/types/money';
import type { Page } from '@/types/social';
import type { PodOrder, PrintSpecs } from '@/types/pod';

const call = <T = unknown>(path: string, body?: Record<string, unknown>) => {
  const route = findMock('POST', path, 'auto');
  if (!route) throw new Error(`no mock for ${path}`);
  return runMock({ ...route, latencyMs: 0 }, { path, body }) as Promise<T>;
};

const specs: PrintSpecs = { paper: 'A4', color: false, doubleSided: false, copies: 1, pages: 100 };

/** Pays for a delivery print order (item ₹200 + delivery ₹40) and returns the order. */
const buyPrint = async (couponCode?: string) => {
  const session = await call<{ sessionId: string; discount: number; amount: number }>('/payments/start', {
    amount: 240,
    itemTotal: 200,
    purpose: 'pod-order',
    module: 'pod',
    couponCode,
  });
  const paid = await call<{ reference: string }>('/payments/confirm', { sessionId: session.sessionId, method: 'upi' });
  const order = await call<PodOrder>('/pod/order', {
    shopId: 'sunrise',
    fileId: 'f',
    fileName: 'a.pdf',
    specs,
    fulfilment: 'delivery',
    address: '12 Rose Street, Madhapur',
    paymentRef: paid.reference,
  });
  return { session, order };
};

describe('coupons', () => {
  it('discounts the item total up to the cap, and rejects unknown or mismatched codes', async () => {
    await expect(call<CouponCheck>('/coupons/validate', { code: 'welcome50', itemTotal: 200 })).resolves.toEqual({ code: 'WELCOME50', fundedBy: 'ruxstar', discount: 100 });
    await expect(call('/coupons/validate', { code: 'NOPE', itemTotal: 200 })).rejects.toMatchObject({ kind: 'not_found' });
    await expect(call('/coupons/validate', { code: 'FLEX10', itemTotal: 200, module: 'events' })).rejects.toMatchObject({ kind: 'conflict' });
  });

  it('lets a vendor create, reject duplicates of, and switch off a coupon', async () => {
    await expect(call('/vendor/coupons/create', { code: 'ab', percent: 10, cap: 50 })).rejects.toMatchObject({ kind: 'validation' });
    await call('/vendor/coupons/create', { code: 'DIWALI20', percent: 20, cap: 300 });
    await expect(call('/vendor/coupons/create', { code: 'DIWALI20', percent: 20, cap: 300 })).rejects.toMatchObject({ kind: 'conflict' });
    await call('/vendor/coupons/toggle', { code: 'DIWALI20', active: false });
    await expect(call('/coupons/validate', { code: 'DIWALI20', itemTotal: 200 })).rejects.toMatchObject({ kind: 'not_found' });
  });
});

describe('ledger', () => {
  it('charges a vendor coupon to the vendor, keeps delivery out of the vendor net, and records commission', async () => {
    const { session, order } = await buyPrint('FLEX10');
    expect(session).toMatchObject({ discount: 20, amount: 220 });

    const page = await call<Page<LedgerEntry>>('/vendor/ledger');
    const entry = page.items.find((e) => e.refId === order.id) as LedgerEntry;
    expect(entry).toMatchObject({ gross: 200, discount: 20, fundedBy: 'vendor', commission: 16, deliveryFee: 40, vendorNet: 164, status: 'pending' });
  });

  it('does not reduce the vendor net for a Ruxstar-funded coupon', async () => {
    const { order } = await buyPrint('WELCOME50');
    const page = await call<Page<LedgerEntry>>('/vendor/ledger');
    expect(page.items.find((e) => e.refId === order.id)).toMatchObject({ fundedBy: 'ruxstar', vendorNet: 184 });
  });
});

describe('cancel and refund', () => {
  it('refunds in full inside the window, then refuses a second cancel', async () => {
    const { order } = await buyPrint();
    await expect(call<CancelQuote>('/orders/cancel-quote', { refId: order.id })).resolves.toMatchObject({ allowed: true, refundable: 240 });

    await expect(call<CancelResult>('/orders/cancel', { refId: order.id })).resolves.toMatchObject({ refunded: 240 });
    const mine = await call<Engagement[]>('/orders/list');
    expect(mine.find((e) => e.refId === order.id)).toMatchObject({ status: 'cancelled', subtitle: 'Refunded ₹240' });
    const entry = (await call<Page<LedgerEntry>>('/vendor/ledger')).items.find((e) => e.refId === order.id);
    expect(entry?.status).toBe('refunded');
    await expect(call('/orders/cancel', { refId: order.id })).rejects.toMatchObject({ kind: 'conflict' });
  });

  it('refuses to cancel an order that is already complete', async () => {
    const { order } = await buyPrint();
    for (let i = 0; i < 5; i += 1) await call('/pod/vendor/advance', { id: order.id });
    await expect(call('/orders/cancel', { refId: order.id })).rejects.toMatchObject({ kind: 'conflict' });
  });
});

describe('payouts', () => {
  it('verifies UPI ids before they can receive money', async () => {
    await expect(call('/payouts/add-upi', { upi: 'nope' })).rejects.toMatchObject({ kind: 'validation' });
    await expect(call('/payouts/add-upi', { upi: 'me@fail' })).rejects.toMatchObject({ kind: 'validation' });
    await expect(call('/payouts/add-upi', { upi: 'priya@okbank' })).resolves.toMatchObject({ kind: 'upi', verified: true });
  });

  it('enforces the minimum, the balance and a verified account, then lowers the balance', async () => {
    const before = await call<EarningsSummary>('/vendor/earnings');
    await expect(call('/payouts/withdraw', { accountId: 'pa-bank', amount: 50 })).rejects.toMatchObject({ kind: 'validation' });
    await expect(call('/payouts/withdraw', { accountId: 'pa-bank', amount: before.withdrawable + 1 })).rejects.toMatchObject({ kind: 'conflict' });
    await expect(call('/payouts/withdraw', { accountId: 'unknown', amount: 500 })).rejects.toMatchObject({ kind: 'forbidden' });

    await expect(call('/payouts/withdraw', { accountId: 'pa-bank', amount: 500 })).resolves.toMatchObject({ amount: 500, status: 'processing' });
    const after = await call<EarningsSummary>('/vendor/earnings');
    expect(after.withdrawable).toBe(before.withdrawable - 500);
    expect(after.withdrawn).toBe(before.withdrawn + 500);
  });
});

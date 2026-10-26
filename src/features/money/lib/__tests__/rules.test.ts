import { commissionFor, discountFor, eligibleAt, ledgerStatus, nextSettlement, refundFor, vendorNetFor } from '../rules';

const DAY = 86_400_000;
const paidAt = '2026-10-10T10:00:00.000Z';
const at = (days: number) => new Date(new Date(paidAt).getTime() + days * DAY).getTime();

describe('vendor net', () => {
  it('deducts commission from the item total', () => {
    expect(commissionFor('pod', 1000)).toBe(80);
    expect(vendorNetFor(1000, 80, 0)).toBe(920);
  });

  it('charges a vendor-funded coupon to the vendor but a Ruxstar-funded one to Ruxstar', () => {
    expect(vendorNetFor(1000, 80, 100, 'vendor')).toBe(820);
    expect(vendorNetFor(1000, 80, 100, 'ruxstar')).toBe(920);
  });

  it('never goes negative', () => {
    expect(vendorNetFor(50, 10, 200, 'vendor')).toBe(0);
  });
});

describe('discountFor', () => {
  it('applies the percent, the cap, and never exceeds the total', () => {
    expect(discountFor(10, 500, 1000)).toBe(100);
    expect(discountFor(50, 200, 1000)).toBe(200);
    expect(discountFor(100, 5000, 300)).toBe(300);
  });
});

describe('pending window', () => {
  it('becomes eligible at completion or after 7 days, whichever is first', () => {
    expect(eligibleAt(paidAt)).toBe(new Date(at(7)).toISOString());
    expect(eligibleAt(paidAt, new Date(at(2)).toISOString())).toBe(new Date(at(2)).toISOString());
    expect(eligibleAt(paidAt, new Date(at(9)).toISOString())).toBe(new Date(at(7)).toISOString());
  });

  it('reports pending, available and refunded', () => {
    const entry = { refunded: false, eligibleAt: new Date(at(7)).toISOString() };
    expect(ledgerStatus(entry, at(3))).toBe('pending');
    expect(ledgerStatus(entry, at(8))).toBe('available');
    expect(ledgerStatus({ ...entry, refunded: true }, at(8))).toBe('refunded');
  });
});

describe('nextSettlement', () => {
  it('is always a Monday in the future', () => {
    ['2026-10-19', '2026-10-21', '2026-10-25'].forEach((day) => {
      const next = new Date(nextSettlement(new Date(`${day}T12:00:00`)));
      expect(next.getDay()).toBe(1);
      expect(next.getTime()).toBeGreaterThan(new Date(`${day}T12:00:00`).getTime());
    });
  });
});

describe('refundFor', () => {
  const base = { module: 'pod' as const, paid: 500, completed: false, paidAt };

  it('refunds in full inside the window with no approval', () => {
    expect(refundFor({ ...base, now: at(3) })).toMatchObject({ allowed: true, refund: 500 });
  });

  it('says nothing is refunded when nothing was charged', () => {
    expect(refundFor({ ...base, paid: 0, now: at(1) })).toEqual({ allowed: true, refund: 0, reason: 'This will be cancelled. Nothing was charged.' });
  });

  it('refuses after completion or after the window closes', () => {
    expect(refundFor({ ...base, completed: true, now: at(1) })).toMatchObject({ allowed: false, refund: 0 });
    expect(refundFor({ ...base, now: at(8) })).toMatchObject({ allowed: false, refund: 0 });
  });

  it('does not refund a coaching dropout after the first session, but refunds before it', () => {
    const coaching = { ...base, module: 'coaching' as const, paid: 6400 };
    expect(refundFor({ ...coaching, firstSessionStarted: true, now: at(2) })).toMatchObject({ allowed: true, refund: 0 });
    expect(refundFor({ ...coaching, firstSessionStarted: false, now: at(2) })).toMatchObject({ allowed: true, refund: 6400 });
  });
});

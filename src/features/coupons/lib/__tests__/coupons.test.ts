import type { ManagedCoupon } from '@/types/coupon';
import { dayKeyOf, draftErrors, draftOf, emptyDraft, newCouponOf, patchOf } from '../coupons';

const today = '2026-11-13';
const coupon = (over: Partial<ManagedCoupon> = {}): ManagedCoupon => ({
  id: 'c1',
  code: 'PRINT20',
  fundedBy: 'vendor',
  vendor: { id: 'v1', name: 'Asha' },
  businesses: [{ id: 'b1', name: 'Asha Prints' }],
  modules: ['pod'],
  kind: 'percent',
  value: 20,
  cap: 50_000,
  label: '20% off up to ₹500',
  minOrder: 20_000,
  startsAt: '2026-11-01T00:00:00+05:30',
  endsAt: '2026-11-30T23:59:59+05:30',
  limit: 100,
  perCustomer: 1,
  firstOrderOnly: false,
  listed: true,
  active: true,
  stoppedByRuxstar: false,
  used: 3,
  state: 'active',
  createdAt: '2026-11-01T00:00:00Z',
  updatedAt: '2026-11-01T00:00:00Z',
  ...over,
});

describe('coupon form', () => {
  it('reads a day in India, not UTC', () => {
    expect(dayKeyOf('2026-11-30T18:29:59Z')).toBe('2026-11-30');
    expect(dayKeyOf('2026-11-30T18:30:00Z')).toBe('2026-12-01');
  });

  it('checks the code, the discount and the shops when making one', () => {
    const errors = draftErrors({ ...emptyDraft(), code: 'AB', value: '120' }, { creating: true, needsShops: true, today });
    expect(Object.keys(errors).sort()).toEqual(['code', 'shops', 'value']);
    const flat = { ...emptyDraft(), code: 'FLAT100', kind: 'flat' as const, value: '0.5' };
    expect(draftErrors(flat, { creating: true, needsShops: false, today }).value).toBeDefined();
    expect(draftErrors({ ...flat, value: '100' }, { creating: true, needsShops: false, today })).toEqual({});
  });

  it('refuses an end before the start or in the past', () => {
    const d = { ...emptyDraft(), code: 'WEEK', value: '10' };
    expect(draftErrors({ ...d, ends: '2026-11-12' }, { creating: true, needsShops: false, today }).ends).toBeDefined();
    expect(draftErrors({ ...d, starts: '2026-11-20', ends: '2026-11-19' }, { creating: true, needsShops: false, today }).ends).toBeDefined();
    expect(draftErrors({ ...d, ends: today }, { creating: true, needsShops: false, today })).toEqual({});
  });

  it('sends paise, whole days and empty limits as none', () => {
    const body = newCouponOf(
      { ...emptyDraft(), code: 'NEW50', kind: 'flat', value: '50', minOrder: '199.5', ends: '2026-11-30', perCustomer: '', businessIds: ['b1'] },
      true,
    );
    expect(body).toEqual({
      code: 'NEW50',
      kind: 'flat',
      value: 5_000,
      minOrder: 19_950,
      startsAt: null,
      endsAt: '2026-11-30T23:59:59+05:30',
      limit: null,
      perCustomer: null,
      firstOrderOnly: false,
      listed: true,
      businessIds: ['b1'],
    });
    expect(newCouponOf({ ...emptyDraft(), code: 'PCT', value: '10', cap: '' }, false).cap).toBeNull();
  });

  it('patches only what changed, and never a start that has passed', () => {
    const before = coupon();
    expect(patchOf(draftOf(before), before, true)).toEqual({});
    const changed = { ...draftOf(before), limit: '', starts: '2026-12-01', businessIds: ['b2', 'b1'] };
    expect(patchOf(changed, before, true)).toEqual({ limit: null, businessIds: ['b2', 'b1'] });
    expect(patchOf(changed, coupon({ state: 'scheduled' }), false)).toEqual({ limit: null, startsAt: '2026-12-01T00:00:00+05:30' });
  });
});

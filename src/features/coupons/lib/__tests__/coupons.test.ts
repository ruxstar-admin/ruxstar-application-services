import type { ManagedCoupon } from '@/types/coupon';
import { couponShops, couponState, dayKeyOf, discountLine, draftErrors, draftOf, emptyDraft, newCouponOf, patchOf, worksAtLine } from '../coupons';

describe('couponState', () => {
  const offer = { code: 'SAVE20', fundedBy: 'vendor', label: '20% off', terms: null, discount: 40000, problem: null } as const;

  it('applies a code the API checked and found fine, named for who runs the business', () => {
    const result = { offers: [offer], checked: { code: 'SAVE20', discount: 40000, problem: null } };
    expect(couponState(result, 'SAVE20')).toEqual({ applied: { code: 'SAVE20', label: 'Shop offer' }, discount: 40000, problem: null });
    expect(couponState(result, 'SAVE20', 'Organiser').applied).toEqual({ code: 'SAVE20', label: 'Organiser offer' });
    const ruxstar = { offers: [{ ...offer, fundedBy: 'ruxstar' as const }], checked: result.checked };
    expect(couponState(ruxstar, 'SAVE20', 'Institute').applied?.label).toBe('Ruxstar offer');
    expect(couponState({ offers: [], checked: { code: 'HIDDEN', discount: 1000, problem: null } }, 'HIDDEN').applied).toEqual({ code: 'HIDDEN', label: null });
  });

  it('gives the reason a code fails, in the API’s words', () => {
    const result = { offers: [offer], checked: { code: 'OLD10', discount: 0, problem: 'This coupon has ended.' } };
    expect(couponState(result, 'OLD10')).toEqual({ applied: null, discount: 0, problem: 'This coupon has ended.' });
  });

  it('applies nothing while a different code, or none, is checked', () => {
    const result = { offers: [offer], checked: { code: 'SAVE20', discount: 40000, problem: null } };
    expect(couponState(result, 'OTHER')).toEqual({ applied: null, discount: 0, problem: null });
    expect(couponState(result, null).applied).toBeNull();
    expect(couponState(undefined, 'SAVE20').applied).toBeNull();
  });
});

describe('discountLine', () => {
  it('says how much came off, with which code and who paid for it', () => {
    expect(discountLine(5000, { code: 'GIG50', fundedBy: 'vendor' }, 'Organiser')).toBe('₹50 off with GIG50 · Organiser offer');
    expect(discountLine(5000, { code: 'RUX50', fundedBy: 'ruxstar' }, 'Organiser')).toBe('₹50 off with RUX50 · Ruxstar offer');
    expect(discountLine(5000, null)).toBe('₹50 off');
  });
});

describe('worksAtLine', () => {
  it('names a vendor coupon’s businesses', () => {
    expect(worksAtLine({ businesses: [{ id: 'b1', name: 'Asha Prints' }], modules: ['pod'] })).toBe('Asha Prints');
  });

  it('says what a Ruxstar coupon works on', () => {
    expect(worksAtLine({ businesses: [], modules: ['pod'] })).toBe('Every print shop');
    expect(worksAtLine({ businesses: [], modules: [] })).toBe('Every print shop');
    expect(worksAtLine({ businesses: [], modules: ['events', 'coaching'] })).toBe('Every business, on event tickets and coaching fees');
    expect(worksAtLine({ businesses: [], modules: ['coaching', 'pod', 'turf'] })).toBe('Every business, on print orders, coaching fees and ground bookings');
  });
});

describe('couponShops', () => {
  it('offers print shops, events, coaching, sports grounds and stays', () => {
    const list = [
      { id: 'p', name: 'Prints', module: 'pod' },
      { id: 'e', name: 'Gigs', module: 'events' },
      { id: 'c', name: 'Tuition', module: 'coaching' },
      { id: 's', name: 'PG', module: 'stays' },
      { id: 't', name: 'Arena', module: 'turf' },
    ] as const;
    expect(couponShops(list).map((b) => b.id)).toEqual(['p', 'e', 'c', 's', 't']);
  });
});

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

  it('sends what a Ruxstar coupon works on, at least one', () => {
    const d = { ...emptyDraft(), code: 'EVENTS10', value: '10' };
    expect(newCouponOf(d, false).modules).toBeUndefined();
    expect(newCouponOf({ ...d, modules: ['events', 'coaching'] }, false, true).modules).toEqual(['events', 'coaching']);
    expect(draftErrors({ ...d, modules: [] }, { creating: true, needsShops: false, needsModules: true, today }).modules).toBe('Pick at least one');
    expect(draftErrors({ ...d, modules: [] }, { creating: true, needsShops: false, today })).toEqual({});
  });

  it('patches only what changed, and never a start that has passed', () => {
    const before = coupon();
    expect(patchOf(draftOf(before), before, true)).toEqual({});
    const changed = { ...draftOf(before), limit: '', starts: '2026-12-01', businessIds: ['b2', 'b1'] };
    expect(patchOf(changed, before, true)).toEqual({ limit: null, businessIds: ['b2', 'b1'] });
    expect(patchOf(changed, coupon({ state: 'scheduled' }), false)).toEqual({ limit: null, startsAt: '2026-12-01T00:00:00+05:30' });
  });
});

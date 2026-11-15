import { money } from '@/features/vendor/lib/pod';
import type { Child, CourseDetail } from '@/types/coaching';
import { couponState, feeLine, orderPrice, seatsLine, studentOptions } from '../coaching';
import { childErrors, childLine } from '../children';

describe('orderPrice', () => {
  it('adds the platform fee only when there is a fee', () => {
    expect(orderPrice(200000, 500)).toEqual({ items: 200000, discount: 0, fee: 500, total: 200500 });
    expect(orderPrice(0, 500)).toEqual({ items: 0, discount: 0, fee: 0, total: 0 });
  });

  it('takes a coupon off the fee, never below nothing, and keeps the platform fee', () => {
    expect(orderPrice(200000, 500, 20000)).toEqual({ items: 200000, discount: 20000, fee: 500, total: 180500 });
    expect(orderPrice(10000, 500, 50000)).toEqual({ items: 10000, discount: 10000, fee: 500, total: 500 });
  });
});

describe('couponState', () => {
  const offer = { code: 'SAVE20', fundedBy: 'vendor', label: '20% off', terms: null, discount: 40000, problem: null } as const;

  it('applies a code the API checked and found fine', () => {
    const result = { offers: [offer], checked: { code: 'SAVE20', discount: 40000, problem: null } };
    expect(couponState(result, 'SAVE20')).toEqual({ applied: { code: 'SAVE20', label: 'Shop offer' }, discount: 40000, problem: null });
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

describe('feeLine and seatsLine', () => {
  it('words the lowest fee, a free course, or nothing open', () => {
    expect(feeLine({ feeFrom: 200000, openBatches: 2 })).toBe(`From ${money(200000)}`);
    expect(feeLine({ feeFrom: 0, openBatches: 1 })).toBe('Free');
    expect(feeLine({ feeFrom: null, openBatches: 0 })).toBe('No batches open');
  });

  it('counts seats left', () => {
    expect(seatsLine({ seatsLeft: 1, status: 'open' })).toBe('1 seat left');
    expect(seatsLine({ seatsLeft: 4, status: 'open' })).toBe('4 seats left');
    expect(seatsLine({ seatsLeft: 0, status: 'open' })).toBe('Full');
  });
});

describe('studentOptions', () => {
  const children: Child[] = [{ id: 'k1', name: 'Ravi', birthYear: 2014, enrolments: 1 }];
  const course: Pick<CourseDetail, 'demoTaken' | 'myOrders'> = {
    demoTaken: [{ childId: 'k1', name: 'Ravi' }],
    myOrders: [
      { id: 'o1', orderNo: 1, kind: 'batch', status: 'confirmed', student: { childId: null, name: 'Asha' }, batchId: 'b1' },
      { id: 'o2', orderNo: 2, kind: 'batch', status: 'cancelled', student: { childId: 'k1', name: 'Ravi' }, batchId: 'b1' },
    ],
  };

  it('offers me and each child', () => {
    expect(studentOptions('Asha', children, course, { kind: 'batch', batchId: 'b2' })).toEqual([
      { key: 'me', label: 'Me (Asha)', taken: null },
      { key: 'k1', label: 'Ravi', taken: null },
    ]);
  });

  it('allows one demo per student per course', () => {
    const [me, ravi] = studentOptions('Asha', children, course, { kind: 'demo' });
    expect(me!.taken).toBeNull();
    expect(ravi!.taken).toBe('Had a demo for this course already');
  });

  it('stops enrolling twice in a batch, but not after cancelling', () => {
    const [me, ravi] = studentOptions(null, children, course, { kind: 'batch', batchId: 'b1' });
    expect(me).toEqual({ key: 'me', label: 'Me', taken: 'Already in this batch' });
    expect(ravi!.taken).toBeNull();
  });
});

describe('children', () => {
  it('checks the name and an optional year of birth', () => {
    expect(childErrors('Ravi', '', 2026)).toEqual({});
    expect(childErrors('Ravi', '2014', 2026)).toEqual({});
    expect(childErrors('R', '', 2026).name).toBe('At least 2 letters');
    expect(childErrors('Ravi', '2027', 2026).birthYear).toBe('A year from 1990 to 2026');
    expect(childErrors('Ravi', '14', 2026).birthYear).toBeDefined();
  });

  it('words a child for the list', () => {
    expect(childLine({ birthYear: 2014, enrolments: 2 })).toBe('Born 2014 · 2 classes');
    expect(childLine({ birthYear: null, enrolments: 0 })).toBe('Not enrolled yet');
  });
});

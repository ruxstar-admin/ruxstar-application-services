import { LINE_LOOK, signedAmount } from '../statement';

describe('statement lines', () => {
  it('signs money in and out, but not money becoming available', () => {
    expect(signedAmount({ kind: 'paid', amount: 324_000 })).toBe('+₹3,240');
    expect(signedAmount({ kind: 'refund', amount: -50_000 })).toBe('−₹500');
    expect(signedAmount({ kind: 'delivery', amount: -4_050 })).toBe('−₹40.50');
    expect(signedAmount({ kind: 'available', amount: 274_000 })).toBe('₹2,740');
  });

  it('names delivery partner pay for what it is', () => {
    expect(LINE_LOOK.delivery.title).toBe('Delivery partner pay');
    expect(LINE_LOOK.refund.title).toBe('Refund to customer');
  });
});

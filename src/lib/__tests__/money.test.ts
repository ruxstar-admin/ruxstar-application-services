import { formatRupees } from '../money';

describe('formatRupees', () => {
  it.each([
    [0, '₹0'],
    [950, '₹950'],
    [48200, '₹48,200'],
    [1234567, '₹12,34,567'],
    [99.6, '₹100'],
  ])('formats %d as %s', (amount, expected) => {
    expect(formatRupees(amount)).toBe(expected);
  });
});

import type { PrintSpecs } from '@/types/pod';
import { deliveryFeeFor, nextStatus, quotePod, sheetsFor, weightFor } from '../pricing';

const shop = { bwRate: 2, colorRate: 8 };
const specs = (over: Partial<PrintSpecs> = {}): PrintSpecs => ({ paper: 'A4', color: false, doubleSided: false, copies: 1, pages: 10, ...over });

describe('quotePod', () => {
  it('prices black and white A4 per page and copy', () => {
    expect(quotePod(shop, specs({ copies: 3 }), 'pickup')).toMatchObject({ total: 60, lines: [{ amount: 60 }] });
  });

  it('charges colour at the colour rate and A3 at double', () => {
    expect(quotePod(shop, specs({ color: true }), 'pickup').total).toBe(80);
    expect(quotePod(shop, specs({ paper: 'A3' }), 'pickup').total).toBe(40);
  });

  it('adds a delivery fee by weight tier only for delivery', () => {
    expect(quotePod(shop, specs(), 'pickup').lines).toHaveLength(1);
    const light = quotePod(shop, specs(), 'delivery');
    expect(light.lines[1]).toEqual({ label: 'Delivery', amount: 40, kind: 'delivery' });
    expect(light.total).toBe(20 + 40);
  });
});

describe('weight and delivery tiers', () => {
  it('halves sheets for double-sided and rounds up', () => {
    expect(sheetsFor(specs({ pages: 5, doubleSided: true }))).toBe(3);
    expect(weightFor(specs({ pages: 100, copies: 2, paper: 'A3' }))).toBe(200 * 5 * 2);
  });

  it.each([
    [500, 40],
    [501, 70],
    [2000, 70],
    [2001, 120],
  ])('weight %d g costs ₹%d to deliver', (grams, fee) => {
    expect(deliveryFeeFor(grams)).toBe(fee);
  });
});

describe('nextStatus', () => {
  it('skips the delivery leg for pickup', () => {
    expect(nextStatus('ready', 'pickup')).toBe('completed');
    expect(nextStatus('ready', 'delivery')).toBe('out_for_delivery');
  });

  it('stops after completion or cancellation', () => {
    expect(nextStatus('completed', 'delivery')).toBeUndefined();
    expect(nextStatus('cancelled', 'pickup')).toBeUndefined();
  });
});

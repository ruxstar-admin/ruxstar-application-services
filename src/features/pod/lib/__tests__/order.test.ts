import type { OrderPrice } from '@/types/order';
import { nextSteps, priceLines, tripActive, vehicleLine } from '../order';

const price = (over: Partial<OrderPrice> = {}): OrderPrice => ({
  units: 2,
  unitPrice: 500,
  extrasPerUnit: 0,
  items: 1000,
  discount: 0,
  coupon: null,
  platformFee: 0,
  delivery: 0,
  deliveryKm: null,
  total: 1000,
  ...over,
});

describe('tripActive', () => {
  it('is on while a rider is offered it, has it or is bringing it', () => {
    expect(tripActive({ status: 'offered' })).toBe(true);
    expect(tripActive({ status: 'accepted' })).toBe(true);
    expect(tripActive({ status: 'picked_up' })).toBe(true);
  });

  it('is off once delivered, cancelled, or when the shop delivers itself', () => {
    expect(tripActive({ status: 'delivered' })).toBe(false);
    expect(tripActive({ status: 'cancelled' })).toBe(false);
    expect(tripActive(null)).toBe(false);
    expect(tripActive(undefined)).toBe(false);
  });
});

describe('nextSteps', () => {
  it('lets the shop deliver a ready order itself', () => {
    expect(nextSteps({ status: 'ready', delivery: null })).toEqual(['out_for_delivery', 'delivered']);
  });

  it('leaves the order to the rider while their trip is live', () => {
    const delivery = { status: 'accepted' } as NonNullable<Parameters<typeof nextSteps>[0]['delivery']>;
    expect(nextSteps({ status: 'ready', delivery })).toEqual([]);
  });

  it('hands the order back when the trip was cancelled', () => {
    const delivery = { status: 'cancelled' } as NonNullable<Parameters<typeof nextSteps>[0]['delivery']>;
    expect(nextSteps({ status: 'ready', delivery })).toEqual(['out_for_delivery', 'delivered']);
  });
});

describe('priceLines', () => {
  it('shows the delivery charge with the distance it was priced on', () => {
    expect(priceLines(price({ delivery: 4600, deliveryKm: 5 }), 'per_unit').at(-1)).toEqual({ label: 'Delivery · 5 km', amount: 4600 });
    expect(priceLines(price({ delivery: 3000 }), 'per_unit').at(-1)).toEqual({ label: 'Delivery', amount: 3000 });
  });

  it('leaves free delivery out', () => {
    expect(priceLines(price(), 'per_unit').some((l) => l.label.startsWith('Delivery'))).toBe(false);
  });
});

describe('vehicleLine', () => {
  it('names the vehicle and its plate', () => {
    expect(vehicleLine({ type: 'scooter', number: 'TS09AB1234' })).toBe('Scooter TS09AB1234');
    expect(vehicleLine({ type: 'bike', number: 'KA01X9999' })).toBe('Bike KA01X9999');
  });
});

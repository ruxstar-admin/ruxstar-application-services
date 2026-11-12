import { coverColours, deliveryLine, fromLine, photoFor, placeLine, productPrice, readyLine } from '../shop';
import type { ShopProduct } from '@/types/shop';

const product = (over: Partial<ShopProduct>): ShopProduct => ({
  id: 'documents',
  label: 'Documents',
  description: '',
  pricing: 'per_page',
  minQuantity: 1,
  turnaroundDays: 1,
  basePrice: null,
  bw: null,
  color: null,
  extras: [],
  tiers: [],
  options: [],
  ...over,
});

describe('shop card lines', () => {
  it('shows the lowest price with its unit', () => {
    expect(fromLine({ fromPrice: 200, fromUnit: 'page' })).toBe('From ₹2/page');
    expect(fromLine({ fromPrice: 25050, fromUnit: 'unit' })).toBe('From ₹250.50/unit');
    expect(fromLine({ fromPrice: null, fromUnit: null })).toBeNull();
  });

  it('reads ready time, place and delivery', () => {
    expect(readyLine(1)).toBe('Ready in 1 day');
    expect(readyLine(3)).toBe('Ready in 3 days');
    expect(placeLine({ area: 'Madhapur', city: 'Hyderabad' })).toBe('Madhapur, Hyderabad');
    expect(placeLine({ area: null, city: 'Hyderabad' })).toBe('Hyderabad');
    expect(deliveryLine({ deliversEverywhere: true, city: 'Hyderabad' })).toBe('Delivers everywhere');
    expect(deliveryLine({ deliversEverywhere: false, city: 'Hyderabad' })).toBe('Delivers in Hyderabad');
    expect(deliveryLine({ deliversEverywhere: false, city: 'Hyderabad', cities: ['hyderabad', 'new delhi'] })).toBe('Delivers to Hyderabad, New Delhi');
  });

  it('picks the narrowest photo copy that is wide enough', () => {
    const photo = {
      url: 'full',
      width: 2048,
      height: 1536,
      smaller: [
        { url: 's480', width: 480, height: 360 },
        { url: 's1080', width: 1080, height: 810 },
      ],
    };
    expect(photoFor(photo, 400)).toBe('s480');
    expect(photoFor(photo, 900)).toBe('s1080');
    expect(photoFor(photo, 1500)).toBe('full');
  });

  it('prices products per page or per unit', () => {
    expect(productPrice(product({ bw: 200, color: 1000 }))).toBe('B/W ₹2 · Colour ₹10 a page');
    expect(productPrice(product({ pricing: 'per_unit', basePrice: 25000 }))).toBe('₹250 each');
  });

  it('keeps the same fallback colours for a name', () => {
    expect(coverColours('Sunrise Prints')).toEqual(coverColours('Sunrise Prints'));
  });
});

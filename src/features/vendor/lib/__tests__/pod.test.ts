import { addressOf, paiseOf, priceLine, rupeeInput, rupeesText } from '../pod';

describe('rupee fields', () => {
  it('keeps digits and two decimals', () => {
    expect(rupeeInput('₹1,25.505')).toBe('125.50');
    expect(rupeeInput('12.3.4')).toBe('12.34');
    expect(rupeeInput('abc')).toBe('');
  });

  it('round-trips paise', () => {
    expect(paiseOf('125.5')).toBe(12550);
    expect(paiseOf('0.07')).toBe(7);
    expect(paiseOf('')).toBeNull();
    expect(rupeesText(12550)).toBe('125.50');
    expect(rupeesText(25000)).toBe('250');
    expect(rupeesText(null)).toBe('');
  });
});

describe('summaries', () => {
  const base = { product: 'tshirts' as const, minQuantity: 1, turnaroundDays: null, extras: [], tiers: [] };

  it('describes unit and page prices', () => {
    expect(priceLine({ ...base, model: 'per_unit', basePrice: 25000, bw: null, color: null })).toBe('₹250 a unit · min 1');
    expect(priceLine({ ...base, product: 'documents', model: 'per_page', basePrice: null, bw: 200, color: null })).toBe('B/W ₹2 a page');
    expect(priceLine({ ...base, model: 'per_unit', basePrice: null, bw: null, color: null })).toBeNull();
  });

  it('formats a location as address lines', () => {
    const location = { state: 'Telangana', city: 'Hyderabad', doorNo: '1-2', building: null, street: 'MG Road', area: 'Ameerpet', pincode: '500016', point: null };
    expect(addressOf(location)).toBe('1-2, MG Road\nAmeerpet, Hyderabad\nTelangana 500016');
    expect(addressOf(null)).toBeNull();
  });
});

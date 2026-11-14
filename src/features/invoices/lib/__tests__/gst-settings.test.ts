import type { GstModuleSettings, GstSellerSettings } from '@/types/invoice';
import { bpsOf, codeError, decimalOnly, lowRateLine, moduleErrors, modulePatch, moduleValues, sellerErrors, sellerPatch, sellerValues } from '../gst-settings';

const pod: GstModuleSettings = {
  module: 'pod',
  enabled: true,
  seller: 'vendor',
  withoutGstin: 'bill_of_supply',
  code: '4911',
  codeKind: 'hsn',
  rateBps: 1800,
  lowRate: null,
  items: [],
  pricesIncludeTax: true,
  tcsBps: 50,
  updatedAt: null,
};

const seller: GstSellerSettings = { legalName: 'Ruxstar', tradeName: 'Ruxstar', gstin: null, address: null, feeCode: '998599', feeRateBps: 1800, updatedAt: null };

describe('percent fields', () => {
  it('reads percents as basis points', () => {
    expect(bpsOf('18')).toBe(1800);
    expect(bpsOf('0.5')).toBe(50);
    expect(bpsOf('')).toBeNaN();
    expect(bpsOf('1.234')).toBeNaN();
  });

  it('keeps digits and one dot', () => {
    expect(decimalOnly('1.2.3%')).toBe('1.23');
  });

  it('checks codes and describes lower rates', () => {
    expect(codeError('998599')).toBeUndefined();
    expect(codeError('')).toBeUndefined();
    expect(codeError('49')).toMatch(/4 to 8 digits/);
    expect(lowRateLine({ upTo: 250000, rateBps: 500 })).toBe('5% up to ₹2,500 a piece');
  });
});

describe('module form', () => {
  it('sends only what changed', () => {
    expect(modulePatch(pod, moduleValues(pod))).toEqual({});
    expect(modulePatch(pod, { ...moduleValues(pod), rate: '5', tcs: '1' })).toEqual({ rateBps: 500, tcsBps: 100 });
  });

  it('keeps rates within the limits', () => {
    expect(moduleErrors({ ...moduleValues(pod), rate: '41', tcs: '2.5' })).toMatchObject({ rate: expect.stringMatching(/0 to 40%/), tcs: expect.stringMatching(/0 to 2%/) });
  });
});

describe('seller form', () => {
  const values = { ...sellerValues(seller), gstin: '27AAPFU0939F1ZV', line: '1 MG Road', city: 'Pune', state: 'Maharashtra', pincode: '411001' };

  it('accepts matching details', () => {
    expect(Object.values(sellerErrors(values)).filter(Boolean)).toEqual([]);
  });

  it("needs the address in the GSTIN's state", () => {
    expect(sellerErrors({ ...values, state: 'Telangana' }).state).toMatch(/registered in Maharashtra/);
  });

  it('allows no GSTIN and no address', () => {
    expect(Object.values(sellerErrors(sellerValues(seller))).filter(Boolean)).toEqual([]);
  });

  it('wants the whole address once any of it is filled', () => {
    expect(sellerErrors({ ...sellerValues(seller), city: 'Pune' })).toMatchObject({ line: expect.any(String), state: expect.any(String), pincode: expect.any(String) });
  });

  it('sends only what changed, and clears with null', () => {
    expect(sellerPatch(seller, sellerValues(seller))).toEqual({});
    expect(sellerPatch(seller, values)).toEqual({ gstin: '27AAPFU0939F1ZV', address: { line: '1 MG Road', city: 'Pune', state: 'Maharashtra', pincode: '411001' } });
    const saved = { ...seller, gstin: '27AAPFU0939F1ZV', address: { line: '1 MG Road', city: 'Pune', state: 'Maharashtra', pincode: '411001' } };
    expect(sellerPatch(saved, values)).toEqual({});
    expect(sellerPatch(saved, { ...values, gstin: '', line: '', city: '', state: '', pincode: '' })).toEqual({ gstin: null, address: null });
  });
});

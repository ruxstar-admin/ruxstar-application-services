import type { ModuleSettings } from '@/types/admin';
import { isGstModule, isModuleName, moduleSummary } from '../modules';

const base: ModuleSettings = {
  module: 'events',
  live: true,
  signupsOpen: true,
  commissionBps: 1250,
  platformFee: 500,
  payouts: null,
  deliveryEnabled: false,
  gstinRequired: false,
  delivery: null,
  eventRules: null,
  coachingRules: null,
  turfRules: null,
  updatedAt: '2026-11-15T00:00:00.000Z',
};

describe('moduleSummary', () => {
  it('shows commission and fee for a business module', () => {
    expect(moduleSummary(base)).toBe('12.5% commission · ₹5 fee');
  });

  it('says when there is no fee and new vendors are closed', () => {
    expect(moduleSummary({ ...base, platformFee: 0, signupsOpen: false })).toBe('12.5% commission · no fee · new vendors closed');
  });

  it('shows withdrawal settings for the ledger', () => {
    expect(moduleSummary({ ...base, module: 'ledger', payouts: { fee: 0, minimum: 10000 } })).toBe('No withdrawal fee · least ₹100');
  });

  it('shows partner pay for delivery', () => {
    const delivery = { riderRate: { base: 4000, includedKm: 3, perKm: 800 }, shopFeeMax: { base: 6000, perKm: 1000 }, offerMinutes: 5 };
    expect(moduleSummary({ ...base, module: 'delivery', delivery })).toBe('Partners get ₹40 a trip · offers wait 5 min');
  });
});

describe('module keys', () => {
  it('accepts known modules only', () => {
    expect(isModuleName('turf')).toBe(true);
    expect(isModuleName('toString')).toBe(false);
    expect(isModuleName(undefined)).toBe(false);
    expect(isGstModule('ledger')).toBe(false);
    expect(isGstModule('coaching')).toBe(true);
  });
});

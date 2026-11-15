import type { StatsModuleBlock } from '@/types/admin';
import { asOfText, blockEmpty, hasQueues, isStatsModule, listingsLabel, ordersWord, shownBlocks } from '../stats';

const NOW = Date.parse('2026-11-15T10:00:00.000Z');

describe('asOfText', () => {
  it('says just now under a minute', () => {
    expect(asOfText('2026-11-15T09:59:30.000Z', NOW)).toBe('Counted just now');
  });

  it('counts minutes under an hour', () => {
    expect(asOfText('2026-11-15T09:57:00.000Z', NOW)).toBe('Counted 3 min ago');
  });

  it('treats a clock slightly ahead as just now', () => {
    expect(asOfText('2026-11-15T10:00:20.000Z', NOW)).toBe('Counted just now');
  });

  it('gives the time after an hour', () => {
    expect(asOfText('2026-11-15T08:00:00.000Z', NOW)).toMatch(/^Counted at /);
  });
});

describe('hasQueues', () => {
  const none = { kyc: null, helpTickets: null, reports: null, orderProblems: null, staysObjections: null, shopReturns: null };

  it('is false when the section is null or every count is hidden', () => {
    expect(hasQueues(null)).toBe(false);
    expect(hasQueues(none)).toBe(false);
  });

  it('is true when one count can be seen, even at 0', () => {
    expect(hasQueues({ ...none, shopReturns: 0 })).toBe(true);
  });
});

describe('module blocks', () => {
  const empty: StatsModuleBlock = { module: 'delivery', businesses: null, listings: null, orders: null, money: null };

  it('knows a block with nothing to show', () => {
    expect(blockEmpty(empty)).toBe(true);
    expect(blockEmpty({ ...empty, orders: { today: 0, thisWeek: 0, open: 0 } })).toBe(false);
  });

  it('names orders, bookings and trips', () => {
    expect(ordersWord('shop')).toBe('Orders');
    expect(ordersWord('turf')).toBe('Bookings');
    expect(ordersWord('delivery')).toBe('Trips');
  });

  it('names listings', () => {
    expect(listingsLabel('product')).toBe('Products on sale');
    expect(listingsLabel('property')).toBe('Live PGs & hostels');
  });

  it('has stats for business modules and delivery, not the ledger', () => {
    expect(isStatsModule('shop')).toBe(true);
    expect(isStatsModule('delivery')).toBe(true);
    expect(isStatsModule('ledger')).toBe(false);
  });

  it('shows only known modules with something in them', () => {
    const shop: StatsModuleBlock = { ...empty, module: 'shop', orders: { today: 1, thisWeek: 2, open: 0 } };
    const future = { ...shop, module: 'rentals' } as unknown as StatsModuleBlock;
    expect(shownBlocks([empty, shop, future])).toEqual([shop]);
    expect(shownBlocks(undefined)).toEqual([]);
  });

  it('labels a listing kind it doesn’t know yet', () => {
    expect(listingsLabel('rental' as never)).toBe('Live listings');
  });
});

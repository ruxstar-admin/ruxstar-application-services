import type { StatsModuleBlock } from '@/types/admin';
import { isDashboardSection, liveBusinesses, moduleLine, queueTotal, ticketsNeedingYou } from '../dashboard';

const count = (n: number) => String(n);

const block = (over: Partial<StatsModuleBlock>): StatsModuleBlock => ({
  module: 'events',
  businesses: null,
  listings: null,
  orders: null,
  money: null,
  ...over,
});

describe('dashboard sections', () => {
  it('accepts areas and modules, and nothing else', () => {
    expect(isDashboardSection('waiting')).toBe(true);
    expect(isDashboardSection('businesses')).toBe(true);
    expect(isDashboardSection('stays')).toBe(true);
    expect(isDashboardSection('delivery')).toBe(true);
    expect(isDashboardSection('ledger')).toBe(false);
    expect(isDashboardSection('../admin')).toBe(false);
    expect(isDashboardSection(undefined)).toBe(false);
  });

  it('adds up only the queues this person may see', () => {
    expect(queueTotal(null)).toBe(0);
    expect(queueTotal({ kyc: 2, helpTickets: null, reports: 1, orderProblems: 0, staysObjections: null, shopReturns: 3 })).toBe(6);
  });

  it('counts tickets past reply-by and with nobody on them', () => {
    expect(ticketsNeedingYou({ open: 9, waiting: 2, overdue: 1, unassigned: 3, mine: 4 })).toBe(4);
  });

  it('sums live businesses and skips modules without that count', () => {
    expect(liveBusinesses([block({ businesses: { total: 5, live: 3, drafts: 1, takenDown: 1 } }), block({ module: 'pod' })])).toBe(3);
  });

  it('describes each module in one line', () => {
    expect(moduleLine(block({ module: 'delivery', orders: { today: 9, thisWeek: 20, open: 2 } }), count)).toBe('2 under way');
    expect(moduleLine(block({ businesses: { total: 4, live: 4, drafts: 0, takenDown: 0 } }), count)).toBe('4 live');
    expect(moduleLine(block({ listings: { kind: 'event', live: 7, takenDown: 0 } }), count)).toBe('7 live');
    expect(moduleLine(block({ orders: { today: 5, thisWeek: 9, open: 1 } }), count)).toBe('5 today');
    expect(moduleLine(block({}), count)).toBe('Open');
  });
});

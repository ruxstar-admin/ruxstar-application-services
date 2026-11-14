import type { PermissionInfo } from '@/types/team';
import { cleanUsername, inviteEnds, payLine, permissionsLine, togglePermission } from '../team';

const catalog: PermissionInfo[] = [
  { key: 'orders.view', label: 'See orders', hint: null, needs: null },
  { key: 'orders.move', label: 'Accept and move orders', hint: null, needs: 'orders.view' },
  { key: 'earnings.view', label: "See the shop's earnings", hint: null, needs: 'orders.view' },
  { key: 'shop.open', label: 'Open and close the shop', hint: null, needs: null },
];

describe('payLine', () => {
  it('reads the amount and how often, or nothing without pay', () => {
    expect(payLine({ amount: 1_500_000, per: 'month', note: null })).toBe('₹15,000 a month');
    expect(payLine({ amount: 5_050, per: 'hour', note: null })).toBe('₹50.50 an hour');
    expect(payLine({ amount: 4_000, per: 'order', note: 'Petrol extra' })).toBe('₹40 per order or delivery');
    expect(payLine(null)).toBeNull();
  });
});

describe('togglePermission', () => {
  it('brings what a permission needs, in catalog order', () => {
    expect(togglePermission(catalog, ['shop.open'], 'orders.move', true)).toEqual(['orders.view', 'orders.move', 'shop.open']);
  });

  it('drops what needs a permission when it goes', () => {
    expect(togglePermission(catalog, ['orders.view', 'orders.move', 'earnings.view', 'shop.open'], 'orders.view', false)).toEqual(['shop.open']);
    expect(togglePermission(catalog, ['orders.view', 'orders.move'], 'orders.move', false)).toEqual(['orders.view']);
  });
});

describe('permissionsLine', () => {
  it('names up to two and counts the rest', () => {
    expect(permissionsLine(catalog, [])).toBe('Nothing yet');
    expect(permissionsLine(catalog, ['shop.open', 'orders.view'])).toBe('See orders, Open and close the shop');
    expect(permissionsLine(catalog, ['orders.view', 'orders.move', 'shop.open'])).toBe('See orders and 2 more');
  });
});

describe('inviteEnds', () => {
  const now = Date.parse('2026-11-13T10:00:00Z');
  it('counts whole days left', () => {
    expect(inviteEnds('2026-11-13T09:00:00Z', now)).toBe('Invite ends today');
    expect(inviteEnds('2026-11-14T09:00:00Z', now)).toBe('Invite ends tomorrow');
    expect(inviteEnds('2026-11-20T10:00:00Z', now)).toBe('Invite ends in 7 days');
  });
});

it('cleans a typed username', () => {
  expect(cleanUsername('  @Kiran_Das ')).toBe('kiran_das');
});

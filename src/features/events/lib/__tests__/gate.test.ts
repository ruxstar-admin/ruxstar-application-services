import * as Crypto from 'expo-crypto';
import type { OfflineList } from '@/types/events';
import { checkLocal, findOffline, insideToday, lookupKind, repeatFilter } from '../gate';

jest.mock('@react-native-async-storage/async-storage', () => ({ getItem: jest.fn(), setItem: jest.fn() }));
jest.mock('expo-crypto', () => ({ digestStringAsync: jest.fn(), CryptoDigestAlgorithm: { SHA256: 'SHA-256' } }));

const NOW = '2026-11-16T14:00:00.000Z';
const list: OfflineList = {
  eventId: 'e1',
  day: '2026-11-16',
  at: NOW,
  tickets: [
    { h: 'h1', id: 't1', c: 'ABCDEF', n: 'Ravi', t: 'General', p: 'x', s: 'v', i: null },
    { h: 'h2', id: 't2', c: 'GHJKLM', n: 'Meena', t: 'General', p: 'y', s: 'v', i: '2026-11-16T13:00:00.000Z' },
    { h: 'h3', id: 't3', c: 'NPQRST', n: 'Old', t: 'General', p: 'z', s: 'x', i: null },
  ],
};
const days = ['2026-11-16'];

describe('checking tickets without a connection', () => {
  it('lets a ticket in once a day and shows amber after', () => {
    expect(checkLocal(list, list.tickets[0], { days, queue: [], now: NOW })).toMatchObject({ result: 'ok', message: 'Welcome, Ravi.' });
    const queue = [{ ticketId: 't1', at: '2026-11-16T13:50:00.000Z', manual: false, fresh: true }];
    expect(checkLocal(list, list.tickets[0], { days, queue, now: NOW })).toMatchObject({ result: 'inside', message: 'Already inside since 7:20 pm.' });
  });

  it('trusts check-ins the saved list already had', () => {
    expect(checkLocal(list, list.tickets[1], { days, queue: [], now: NOW })).toMatchObject({ result: 'inside', firstAt: '2026-11-16T13:00:00.000Z' });
    const tomorrow = '2026-11-17T05:00:00.000Z';
    expect(checkLocal(list, list.tickets[1], { days: [...days, '2026-11-17'], queue: [], now: tomorrow }).result).toBe('ok');
  });

  it('stops cancelled tickets, strangers and the wrong day', () => {
    expect(checkLocal(list, list.tickets[2], { days, queue: [], now: NOW }).result).toBe('cancelled');
    expect(checkLocal(list, undefined, { days, queue: [], now: NOW }).result).toBe('unknown');
    expect(checkLocal(list, list.tickets[0], { days: ['2026-11-18'], queue: [], now: NOW }).result).toBe('wrong_day');
  });

  it('counts who is in today across the list and the queue', () => {
    expect(insideToday(list, [{ ticketId: 't1', at: NOW, manual: false, fresh: true }], NOW)).toBe(2);
    expect(insideToday(list, [], '2026-11-17T05:00:00.000Z')).toBe(0);
  });
});

describe('the gate', () => {
  it('reads what was typed as a mobile or a code', () => {
    expect(lookupKind('+91 98765 43210')).toEqual({ phone: '9876543210' });
    expect(lookupKind('abc 123')).toEqual({ code: 'ABC123' });
    expect(lookupKind('12')).toBeNull();
  });

  it('finds tickets on the saved list by code or phone hash', async () => {
    (Crypto.digestStringAsync as jest.Mock).mockResolvedValue('y');
    expect((await findOffline(list, 'abcdef')).map((t) => t.id)).toEqual(['t1']);
    expect((await findOffline(list, '9876543210')).map((t) => t.id)).toEqual(['t2']);
  });

  it('counts a QR held in front of the camera once', () => {
    const first = repeatFilter(4000);
    expect(first('RX1.a')).toBe(true);
    expect(first('RX1.a')).toBe(false);
    expect(first('RX1.b')).toBe(true);
  });
});

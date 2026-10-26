import { findMock, runMock } from '..';
import type { Booking, PropertyDetail, StayResult } from '@/types/stays';

const call = <T = unknown>(path: string, body?: Record<string, unknown>) => {
  const route = findMock('POST', path, 'auto');
  if (!route) throw new Error(`no mock for ${path}`);
  return runMock({ ...route, latencyMs: 0 }, { path, body }) as Promise<T>;
};

const range = { from: '2027-01-10', to: '2027-01-13' };

describe('search', () => {
  it('filters by location text and facilities, and requires valid dates', async () => {
    await expect(call('/stays/search', { q: '', facilities: [], from: '2027-01-13', to: '2027-01-10' })).rejects.toMatchObject({ kind: 'validation' });

    const madhapur = await call<StayResult[]>('/stays/search', { q: 'madhapur', facilities: [], ...range });
    expect(madhapur.map((r) => r.property.id)).toEqual(['pg1']);

    const withParking = await call<StayResult[]>('/stays/search', { q: '', facilities: ['parking', 'meals'], ...range });
    expect(withParking.map((r) => r.property.id)).toEqual(['pg3']);
  });
});

describe('booking', () => {
  it('prices per bed per night and needs payment', async () => {
    await expect(call('/stays/book', { roomId: 'r4', beds: 1, ...range })).rejects.toMatchObject({ status: 402 });
    const booking = await call<Booking>('/stays/book', { roomId: 'r4', beds: 2, paymentRef: 'P1', ...range });
    expect(booking).toMatchObject({ nights: 3, total: 550 * 2 * 3, status: 'confirmed' });
  });

  it('reduces free beds for those nights and blocks overbooking', async () => {
    const before = await call<PropertyDetail>('/stays/get', { id: 'pg2', ...range });
    await call('/stays/book', { roomId: 'r3', beds: before.rooms[0].free, paymentRef: 'P2', ...range });

    const after = await call<PropertyDetail>('/stays/get', { id: 'pg2', ...range });
    expect(after.rooms[0].free).toBe(0);
    await expect(call('/stays/book', { roomId: 'r3', beds: 1, paymentRef: 'P3', ...range })).rejects.toMatchObject({ kind: 'conflict' });

    // The check-out day is free for the next guest.
    const later = await call<PropertyDetail>('/stays/get', { id: 'pg2', from: '2027-01-13', to: '2027-01-14' });
    expect(later.rooms[0].free).toBe(12);
  });
});

describe('vendor tools', () => {
  it('creates a property that shows in Discover and validates room edits', async () => {
    const created = await call<{ id: string }>('/stays/vendor/create', {
      name: 'Hilltop Hostel',
      area: 'Kukatpally',
      address: 'Near metro',
      facilities: ['wifi'],
      room: { name: 'Dorm', sharing: 4, beds: 8, ratePerNight: 250 },
    });
    const listings = await call<{ id: string }[]>('/discover/list', { module: 'pg' });
    expect(listings.some((l) => l.id === created.id)).toBe(true);

    await expect(
      call('/stays/vendor/room/save', { propertyId: created.id, room: { name: 'Bad', sharing: 1, beds: 0, ratePerNight: 100 } }),
    ).rejects.toMatchObject({ kind: 'validation' });
    await expect(
      call('/stays/vendor/room/save', { propertyId: created.id, room: { id: 'r3', name: 'Four-bed dorm', sharing: 4, beds: 14, ratePerNight: 300 } }),
    ).resolves.toMatchObject({ beds: 14 });
  });
});

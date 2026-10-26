import { freeBeds, nightKeys, stayTotal } from '../availability';

describe('nightKeys', () => {
  it('lists nights from check-in up to (not including) check-out', () => {
    expect(nightKeys({ from: '2026-10-30', to: '2026-11-02' })).toEqual(['2026-10-30', '2026-10-31', '2026-11-01']);
    expect(nightKeys({ from: '2026-10-30', to: '2026-10-30' })).toEqual([]);
  });
});

describe('freeBeds', () => {
  const bookings = [
    { from: '2026-10-24', to: '2026-10-26', beds: 2 },
    { from: '2026-10-25', to: '2026-10-28', beds: 1 },
  ];

  it('uses the busiest night in the range', () => {
    expect(freeBeds(4, bookings, { from: '2026-10-24', to: '2026-10-28' })).toBe(1);
  });

  it('frees the check-out day for the next guest', () => {
    expect(freeBeds(1, [{ from: '2026-10-24', to: '2026-10-26', beds: 1 }], { from: '2026-10-26', to: '2026-10-27' })).toBe(1);
  });

  it('is the full capacity when nothing overlaps', () => {
    expect(freeBeds(4, bookings, { from: '2026-10-28', to: '2026-10-30' })).toBe(4);
  });

  it('never goes negative and is zero for an empty range', () => {
    expect(freeBeds(1, [{ from: '2026-10-24', to: '2026-10-26', beds: 3 }], { from: '2026-10-24', to: '2026-10-25' })).toBe(0);
    expect(freeBeds(4, bookings, { from: '2026-10-24', to: '2026-10-24' })).toBe(0);
  });
});

describe('stayTotal', () => {
  it('multiplies rate, beds and nights', () => {
    expect(stayTotal(750, 2, 3)).toBe(4500);
  });
});

import { addDays, combineDateTime, dateKey, formatDateTime, hourSlots, nightsBetween, upcomingDays } from '../dates';

describe('upcomingDays', () => {
  it('starts today and rolls over month ends', () => {
    const days = upcomingDays(3, new Date(2026, 9, 30));
    expect(days.map((d) => d.key)).toEqual(['2026-10-30', '2026-10-31', '2026-11-01']);
    expect(days[0].label).toBe('Today');
    expect(days[1].label).toBe('Sat 31');
  });
});

describe('hourSlots', () => {
  it('labels hours in 12-hour time', () => {
    expect(hourSlots(11, 13)).toEqual([
      { key: '11:00', label: '11 am' },
      { key: '12:00', label: '12 pm' },
      { key: '13:00', label: '1 pm' },
    ]);
  });
});

describe('combineDateTime / formatDateTime', () => {
  it('round-trips a local date and time', () => {
    const iso = combineDateTime('2026-10-24', '18:00');
    const date = new Date(iso);
    expect(dateKey(date)).toBe('2026-10-24');
    expect(date.getHours()).toBe(18);
    expect(formatDateTime(iso)).toMatch(/24 Oct/);
    expect(formatDateTime(iso)).toMatch(/6:00 pm/);
  });
});

describe('nightsBetween', () => {
  it('counts forward nights and clamps backwards ranges to zero', () => {
    expect(nightsBetween('2026-10-24', '2026-10-27')).toBe(3);
    expect(nightsBetween('2026-10-27', '2026-10-24')).toBe(0);
    expect(nightsBetween('2026-10-24', '2026-10-24')).toBe(0);
  });
});

describe('addDays', () => {
  it('moves across month and year boundaries', () => {
    expect(addDays('2026-10-30', 3)).toBe('2026-11-02');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  });
});

import { dayLong, istDayKey, stripDays } from '../days';

// 15 Nov 2026, 11:00 pm in India (a Sunday) is still 14 Nov in UTC.
const lateSunday = Date.parse('2026-11-15T23:00:00+05:30');

describe('stripDays', () => {
  it('starts on India’s today with Today and Tomorrow, then short day names', () => {
    const days = stripDays(4, lateSunday);
    expect(days.map((d) => d.key)).toEqual(['2026-11-15', '2026-11-16', '2026-11-17', '2026-11-18']);
    expect(days.map((d) => d.label)).toEqual(['Today', 'Tomorrow', 'Tue 17', 'Wed 18']);
    expect(days[0]!.weekday).toBe(0);
  });

  it('rolls over month and year ends', () => {
    expect(stripDays(3, Date.parse('2026-12-31T10:00:00+05:30')).map((d) => d.key)).toEqual(['2026-12-31', '2027-01-01', '2027-01-02']);
  });

  it('marks closed weekdays and single closed days', () => {
    const days = stripDays(7, lateSunday, { closedWeekdays: [1], closedDays: ['2026-11-19'] });
    expect(days.filter((d) => d.closed).map((d) => d.key)).toEqual(['2026-11-16', '2026-11-19']);
  });
});

describe('istDayKey / dayLong', () => {
  it('uses India’s calendar, wherever the phone is', () => {
    expect(istDayKey(Date.parse('2026-11-14T19:00:00Z'))).toBe('2026-11-15');
  });

  it('spells the day out for screen readers', () => {
    expect(dayLong('2026-11-15')).toBe('Sunday 15 November');
  });
});

import { compactCount, timeAgo } from '../time';

const NOW = new Date('2026-10-22T12:00:00Z').getTime();
const ago = (ms: number) => new Date(NOW - ms).toISOString();

describe('timeAgo', () => {
  it('formats recent times in the largest whole unit', () => {
    expect(timeAgo(ago(10_000), NOW)).toBe('now');
    expect(timeAgo(ago(5 * 60_000), NOW)).toBe('5m');
    expect(timeAgo(ago(3 * 3_600_000), NOW)).toBe('3h');
    expect(timeAgo(ago(2 * 86_400_000), NOW)).toBe('2d');
  });

  it('treats a future timestamp as now', () => {
    expect(timeAgo(ago(-60_000), NOW)).toBe('now');
  });

  it('falls back to a date after a week', () => {
    expect(timeAgo(ago(10 * 86_400_000), NOW)).toMatch(/Oct/);
  });
});

describe('compactCount', () => {
  it.each([
    [0, '0'],
    [999, '999'],
    [1200, '1.2K'],
    [10_000, '10K'],
    [1_500_000, '1.5M'],
  ])('formats %i as %s', (value, expected) => {
    expect(compactCount(value)).toBe(expected);
  });
});

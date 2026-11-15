import type { RosterStudent } from '@/types/coaching';
import { markLine, marksOf, tickedOf, unsaved } from '../desk';

const NOW = Date.parse('2026-11-16T10:00:00Z');
const MIN = 60_000;
const cls = (startsInMin: number, extra = {}) => ({
  status: 'upcoming' as const,
  marked: false,
  present: 0,
  startsAt: new Date(NOW + startsInMin * MIN).toISOString(),
  endsAt: new Date(NOW + (startsInMin + 60) * MIN).toISOString(),
  ...extra,
});

describe('markLine', () => {
  it('opens attendance 30 minutes before the class', () => {
    expect(markLine(cls(45), NOW).text).toBe('Attendance opens 30 min before');
    expect(markLine(cls(20), NOW).text).toBe('Take attendance');
  });

  it('nudges when a finished class has none, and shows saved ones', () => {
    expect(markLine(cls(-90), NOW).text).toBe('Attendance not taken yet');
    expect(markLine(cls(-90, { marked: true, present: 12 }), NOW).text).toBe('Attendance saved · 12 present');
    expect(markLine(cls(30, { status: 'cancelled' }), NOW).text).toBe('Cancelled');
  });
});

describe('the tick list', () => {
  const students: RosterStudent[] = [
    { orderId: 'a', name: 'Asha', kind: 'batch', child: false, present: true },
    { orderId: 'b', name: 'Ravi', kind: 'batch', child: true, present: false },
    { orderId: 'c', name: 'Meera', kind: 'demo', child: true, present: null },
  ];

  it('starts with those marked present before', () => {
    expect(tickedOf(students)).toEqual(['a']);
  });

  it('marks everyone: ticked present, the rest absent', () => {
    expect(marksOf(students, ['a', 'c'])).toEqual([
      { orderId: 'a', present: true },
      { orderId: 'b', present: false },
      { orderId: 'c', present: true },
    ]);
  });

  it('knows when there is something to save', () => {
    expect(unsaved(students, ['a'])).toBe(true);
    const saved = students.map((s) => ({ ...s, present: s.present ?? false }));
    expect(unsaved(saved, ['a'])).toBe(false);
    expect(unsaved(saved, ['a', 'b'])).toBe(true);
  });
});

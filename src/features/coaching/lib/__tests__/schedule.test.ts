import { boardKey } from '@/lib/booking/board';
import type { Slot } from '@/types/coaching';
import { gridCells, gridColumns, hoursOf, lengthLabel, planClasses, planLine, scheduleText, slotClash, toggleSlot } from '../schedule';

const at = (day: number, start: string, minutes = 60): Slot => ({ day, start, minutes });
const weekdays = [1, 2, 3, 4, 5].map((d) => at(d, '17:00'));

describe('scheduleText', () => {
  it('groups days that share a time, Monday first, like the API', () => {
    expect(scheduleText(weekdays)).toBe('Mon–Fri 5–6 pm');
    expect(scheduleText([at(3, '17:00'), at(1, '17:00')])).toBe('Mon, Wed 5–6 pm');
    expect(scheduleText([at(6, '10:00', 90), ...weekdays])).toBe('Mon–Fri 5–6 pm · Sat 10–11:30 am');
    expect(scheduleText([0, 1, 2, 3, 4, 5, 6].map((d) => at(d, '07:00')))).toBe('Every day 7–8 am');
  });

  it('says am and pm on both ends when a class crosses noon', () => {
    expect(scheduleText([at(0, '11:30')])).toBe('Sun 11:30 am–12:30 pm');
  });
});

describe('lengthLabel', () => {
  it('reads minutes as people say them', () => {
    expect(lengthLabel(45)).toBe('45 min');
    expect(lengthLabel(60)).toBe('1 hr');
    expect(lengthLabel(90)).toBe('1h 30m');
  });
});

describe('toggleSlot', () => {
  it('adds a class on an empty cell', () => {
    expect(toggleSlot([], 1, '17:00', 60)).toEqual({ slots: [at(1, '17:00')], problem: null });
  });

  it('takes a class off when its start or a half hour it runs into is tapped', () => {
    const slots = [at(1, '17:00', 90)];
    expect(toggleSlot(slots, 1, '17:00', 60).slots).toEqual([]);
    expect(toggleSlot(slots, 1, '18:00', 60).slots).toEqual([]);
    expect(toggleSlot(slots, 2, '17:00', 60).slots).toHaveLength(2);
  });

  it('refuses a class that runs into another or past midnight', () => {
    const slots = [at(1, '17:00')];
    const clash = toggleSlot(slots, 1, '16:30', 60);
    expect(clash.slots).toEqual(slots);
    expect(clash.problem).toContain('5 pm class on Monday');
    expect(toggleSlot([], 1, '23:30', 60).problem).toBe('A class has to end by midnight.');
  });

  it('keeps the week in order', () => {
    const { slots } = toggleSlot([at(3, '09:00')], 1, '18:00', 60);
    expect(slots.map((s) => s.day)).toEqual([1, 3]);
  });
});

describe('slotClash', () => {
  it('finds two classes on one day that overlap', () => {
    expect(slotClash([at(1, '17:00'), at(2, '17:00')])).toBeNull();
    expect(slotClash([at(1, '17:00'), at(1, '18:00')])).toBeNull();
    expect(slotClash([at(1, '17:00'), at(1, '17:30')])).toEqual([0, 1]);
  });
});

describe('the weekly grid', () => {
  it('has a column every half hour, plus saved starts between them', () => {
    const keys = gridColumns([at(1, '17:15')]).map((c) => c.key);
    expect(keys[0]).toBe('06:00');
    expect(keys.at(-1)).toBe('21:30');
    expect(keys.indexOf('17:15')).toBe(keys.indexOf('17:00') + 1);
  });

  it('marks where a class starts and shades the half hours it runs into', () => {
    const slots = [at(1, '17:00', 90)];
    const cells = gridCells(slots, gridColumns(slots));
    expect(cells[boardKey('1', '17:00')]).toEqual({ state: 'selected', label: 'to 6:30 pm' });
    expect(cells[boardKey('1', '17:30')]?.state).toBe('held');
    expect(cells[boardKey('1', '18:00')]?.state).toBe('held');
    expect(cells[boardKey('1', '18:30')]).toBeUndefined();
    expect(cells[boardKey('2', '17:00')]).toBeUndefined();
  });
});

describe('planClasses', () => {
  const monWed = [at(1, '17:00'), at(3, '17:00')];

  it('makes classes from the start date by the weekly times until there are enough', () => {
    expect(planClasses(monWed, '2026-11-16', 4).map((c) => c.day)).toEqual(['2026-11-16', '2026-11-18', '2026-11-23', '2026-11-25']);
  });

  it('starts on the first matching day after a start date that has no class', () => {
    expect(planClasses(monWed, '2026-11-15', 1)[0]?.day).toBe('2026-11-16');
  });

  it('puts two classes on one day in time order', () => {
    expect(planClasses([at(1, '18:00'), at(1, '09:00')], '2026-11-16', 2).map((c) => c.start)).toEqual(['09:00', '18:00']);
  });

  it('gives nothing without times or a count', () => {
    expect(planClasses([], '2026-11-16', 4)).toEqual([]);
    expect(planClasses(monWed, '2026-11-16', 0)).toEqual([]);
  });

  it('sums the hours and words the plan', () => {
    const plan = planClasses(monWed, '2026-11-16', 4);
    expect(hoursOf(plan)).toBe(4);
    expect(planLine(plan, (d) => d)).toBe('4 classes over 2 weeks, first on 2026-11-16, last on 2026-11-25');
    expect(planLine([], (d) => d)).toContain('Tap the grid');
  });
});

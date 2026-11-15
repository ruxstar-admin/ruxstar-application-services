import { rangeText } from '@/lib/booking/slots';
import type { DaySlots } from '@/types/turf';

const DAY_MS = 86_400_000;

/** India's calendar day `n` days after `day`; both `YYYY-MM-DD`. */
export const plusDays = (day: string, n: number) => new Date(Date.parse(`${day}T00:00:00Z`) + n * DAY_MS).toISOString().slice(0, 10);

/** The date of each week of a weekly booking: the first day, then the same weekday after. */
export const repeatDays = (day: string, weeks: number) => Array.from({ length: Math.max(1, Math.floor(weeks)) }, (_, i) => plusDays(day, i * 7));

/**
 * What stops the picked times on a later week's day, or null when they're all free. `starts` are the picked `HH:MM` clocks.
 * Only the first date has to be within how far ahead bookings open, so a later day's `bookable` doesn't matter.
 */
export function weekProblem(day: DaySlots, starts: readonly string[]): string | null {
  if (!day.open) return 'The court is closed that day';
  for (const start of starts) {
    const slot = day.slots.find((s) => s.start === start);
    if (!slot) return 'The court isn’t open at these times';
    if (slot.state !== 'free') return `${rangeText(slot.start, slot.end)} is ${slot.state === 'blocked' ? 'blocked by the ground' : 'already booked'}`;
  }
  return null;
}

export interface WeekLine {
  n: number;
  day: string;
  /** Null while it's being checked, or when it's free. */
  problem: string | null;
  checking: boolean;
}

/** One line per week for the repeat list: the first is what's on screen; the rest are checked from each day's slots. */
export function weekLines(first: string, weeks: number, starts: readonly string[], days: Readonly<Record<string, DaySlots | undefined>>): WeekLine[] {
  return repeatDays(first, weeks).map((day, i) => {
    if (i === 0) return { n: 1, day, problem: null, checking: false };
    const slots = days[day];
    return { n: i + 1, day, problem: slots ? weekProblem(slots, starts) : null, checking: !slots };
  });
}

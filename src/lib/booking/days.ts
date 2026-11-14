import { istParts } from '@/lib/dates';

const DAY_MS = 86_400_000;
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
const WEEKDAYS_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;
const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'] as const;

export interface StripDay {
  /** India's calendar day, `YYYY-MM-DD`. */
  key: string;
  /** "Today", "Tomorrow", then "Sat 21". */
  label: string;
  /** 0 = Sunday. */
  weekday: number;
  closed: boolean;
}

export interface ClosedRules {
  /** Single days that are shut, `YYYY-MM-DD`. */
  closedDays?: readonly string[];
  /** Weekdays that are always shut, 0 = Sunday. */
  closedWeekdays?: readonly number[];
}

const utcOf = (key: string) => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(Date.UTC(y!, m! - 1, d!));
};

/** India's day key for a moment, e.g. now. */
export const istDayKey = (at: number) => istParts(new Date(at).toISOString()).day;

/** "Sunday 15 November", for screen readers. */
export function dayLong(key: string): string {
  const d = utcOf(key);
  return `${WEEKDAYS_LONG[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS_LONG[d.getUTCMonth()]}`;
}

/** The next `count` days in India from `now`, marked closed by the rules. */
export function stripDays(count: number, now: number, rules: ClosedRules = {}): StripDay[] {
  const start = utcOf(istDayKey(now)).getTime();
  const shut = new Set(rules.closedDays ?? []);
  const shutWeekdays = new Set(rules.closedWeekdays ?? []);
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(start + i * DAY_MS);
    const key = d.toISOString().slice(0, 10);
    const weekday = d.getUTCDay();
    const label = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : `${WEEKDAYS[weekday]} ${d.getUTCDate()}`;
    return { key, label, weekday, closed: shut.has(key) || shutWeekdays.has(weekday) };
  });
}

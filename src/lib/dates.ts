const DAY_MS = 86_400_000;
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

const pad = (n: number) => String(n).padStart(2, '0');

/** Local calendar date as `YYYY-MM-DD`. */
export const dateKey = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export interface DayOption {
  key: string;
  /** "Thu 22" */
  label: string;
}

/** The next `count` days starting today, for horizontal day pickers. */
export const upcomingDays = (count: number, from: Date = new Date()): DayOption[] =>
  Array.from({ length: count }, (_, i) => {
    const day = new Date(from.getFullYear(), from.getMonth(), from.getDate() + i);
    return { key: dateKey(day), label: i === 0 ? 'Today' : `${WEEKDAYS[day.getDay()]} ${day.getDate()}` };
  });

/** Hourly time slots as `HH:00` from `startHour` to `endHour` inclusive. */
export const hourSlots = (startHour: number, endHour: number): { key: string; label: string }[] =>
  Array.from({ length: endHour - startHour + 1 }, (_, i) => {
    const hour = startHour + i;
    const twelve = hour % 12 === 0 ? 12 : hour % 12;
    return { key: `${pad(hour)}:00`, label: `${twelve} ${hour < 12 ? 'am' : 'pm'}` };
  });

/** Combines a `YYYY-MM-DD` day and `HH:MM` time into an ISO timestamp (local time). */
export const combineDateTime = (day: string, time: string): string => {
  const [y, m, d] = day.split('-').map(Number);
  const [h, min] = time.split(':').map(Number);
  return new Date(y, m - 1, d, h, min).toISOString();
};

/** "Sat, 24 Oct · 6:00 pm" */
export const formatDateTime = (iso: string): string => {
  const date = new Date(iso);
  const day = date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
  const time = date.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true }).replace(/\s?([ap])m/i, (_, p) => ` ${p.toLowerCase()}m`);
  return `${day} · ${time}`;
};

/** "24 Oct" */
export const formatDay = (iso: string): string => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

/** The day key `n` days after a `YYYY-MM-DD` key. */
export const addDays = (key: string, n: number): string => {
  const [y, m, day] = key.split('-').map(Number);
  return dateKey(new Date(y, m - 1, day + n));
};

/** Whole nights between two `YYYY-MM-DD` keys; 0 if the range is not forward. */
export const nightsBetween = (from: string, to: string): number => {
  const a = new Date(`${from}T00:00:00`).getTime();
  const b = new Date(`${to}T00:00:00`).getTime();
  return Math.max(0, Math.round((b - a) / DAY_MS));
};

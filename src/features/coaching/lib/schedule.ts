import { boardKey, type BoardCell, type BoardColumn, type BoardRow } from '@/lib/booking/board';
import type { Slot } from '@/types/coaching';

const DAY_MS = 86_400_000;
const pad = (n: number) => String(n).padStart(2, '0');
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** Monday first, as the week reads on the grid. */
export const WEEK = [1, 2, 3, 4, 5, 6, 0] as const;
/** Class lengths offered, in minutes. */
export const LENGTHS = [30, 45, 60, 90, 120] as const;
export const lengthLabel = (minutes: number) => (minutes < 60 ? `${minutes} min` : minutes % 60 ? `${Math.floor(minutes / 60)}h ${minutes % 60}m` : `${minutes / 60} hr`);

export const minutesOf = (start: string) => Number(start.slice(0, 2)) * 60 + Number(start.slice(3));
const startOf = (minutes: number) => `${pad(Math.floor(minutes / 60) % 24)}:${pad(minutes % 60)}`;
export const endOf = (slot: Pick<Slot, 'start' | 'minutes'>) => startOf(minutesOf(slot.start) + slot.minutes);

/** "5 pm", "10:30 am"; without am/pm when `suffix` is false. */
export function clock(start: string, suffix = true): string {
  const [h, m] = start.split(':').map(Number) as [number, number];
  return `${h % 12 || 12}${m ? `:${pad(m)}` : ''}${suffix ? ` ${h < 12 ? 'am' : 'pm'}` : ''}`;
}

const span = (start: string, end: string) => {
  const sameHalf = Number(start.slice(0, 2)) < 12 === Number(end.slice(0, 2)) < 12;
  return `${clock(start, !sameHalf)}–${clock(end)}`;
};

function daysText(days: number[]): string {
  if (days.length === 7) return 'Every day';
  const order = [...new Set(days)].map((d) => (d + 6) % 7).sort((a, b) => a - b);
  const runs: number[][] = [];
  for (const d of order) {
    const run = runs.at(-1);
    if (run && run.at(-1) === d - 1) run.push(d);
    else runs.push([d]);
  }
  const name = (d: number) => DAY_NAMES[(d + 1) % 7];
  return runs.flatMap((run) => (run.length >= 3 ? [`${name(run[0]!)}–${name(run.at(-1)!)}`] : run.map(name))).join(', ');
}

/** "Mon–Fri 5–6 pm · Sat 10–11:30 am": days sharing a time are grouped, Monday first. The API words it the same way. */
export function scheduleText(slots: readonly Slot[]): string {
  const groups = new Map<string, number[]>();
  for (const slot of [...slots].sort((a, b) => ((a.day + 6) % 7) - ((b.day + 6) % 7) || a.start.localeCompare(b.start))) {
    const key = `${slot.start}|${slot.minutes}`;
    groups.set(key, [...(groups.get(key) ?? []), slot.day]);
  }
  return [...groups.entries()]
    .map(([key, days]) => {
      const [start, minutes] = key.split('|') as [string, string];
      return `${daysText(days)} ${span(start, endOf({ start, minutes: Number(minutes) }))}`;
    })
    .join(' · ');
}

/** Start times in 15-minute steps, early morning to late evening, for moving a class or adding one. */
export const QUARTER_HOURS = Array.from({ length: (22 - 5) * 4 }, (_, i) => {
  const start = startOf(5 * 60 + i * 15);
  return { key: start, label: clock(start) };
});

// The weekly grid: a row per day, a column per half hour.

export const GRID_FROM = '06:00';
export const GRID_TO = '21:30';

/** Half-hour starts across the day, plus any saved start that falls between them. */
export function gridColumns(slots: readonly Slot[] = []): BoardColumn[] {
  const starts = new Set<number>();
  for (let m = minutesOf(GRID_FROM); m <= minutesOf(GRID_TO); m += 30) starts.add(m);
  for (const s of slots) starts.add(minutesOf(s.start));
  return [...starts].sort((a, b) => a - b).map((m) => ({ key: startOf(m), label: clock(startOf(m)) }));
}

export const GRID_ROWS: BoardRow[] = WEEK.map((d) => ({ key: String(d), label: DAY_LONG[d]! }));

const covers = (slot: Slot, day: number, start: string) => slot.day === day && minutesOf(start) >= minutesOf(slot.start) && minutesOf(start) < minutesOf(slot.start) + slot.minutes;

/** A class starts in a picked cell; the half hours it runs into are shaded. */
export function gridCells(slots: readonly Slot[], columns: readonly BoardColumn[]): Record<string, BoardCell> {
  const cells: Record<string, BoardCell> = {};
  for (const slot of slots) {
    cells[boardKey(String(slot.day), slot.start)] = { state: 'selected', label: `to ${clock(endOf(slot))}` };
    for (const col of columns) {
      if (col.key !== slot.start && covers(slot, slot.day, col.key)) cells[boardKey(String(slot.day), col.key)] = { state: 'held', label: 'Class' };
    }
  }
  return cells;
}

/**
 * Taps a cell: on a class, or a half hour it runs into, takes that class off; on an empty cell, adds a class of `minutes`
 * there. Returns the problem in words when the new class would run into another.
 */
export function toggleSlot(slots: readonly Slot[], day: number, start: string, minutes: number): { slots: Slot[]; problem: string | null } {
  const hit = slots.find((s) => covers(s, day, start));
  if (hit) return { slots: slots.filter((s) => s !== hit), problem: null };
  const next: Slot = { day, start, minutes };
  const clash = slots.find((s) => s.day === day && minutesOf(s.start) < minutesOf(start) + minutes && minutesOf(start) < minutesOf(s.start) + s.minutes);
  if (clash) return { slots: [...slots], problem: `That runs into the ${clock(clash.start)} class on ${DAY_LONG[day]}. Pick an earlier time or a shorter class.` };
  if (minutesOf(start) + minutes > 24 * 60) return { slots: [...slots], problem: 'A class has to end by midnight.' };
  return { slots: sortSlots([...slots, next]), problem: null };
}

export const sortSlots = (slots: readonly Slot[]) => [...slots].sort((a, b) => ((a.day + 6) % 7) - ((b.day + 6) % 7) || a.start.localeCompare(b.start));

/** Two classes on the same day that overlap, as their positions. */
export function slotClash(slots: readonly Slot[]): [number, number] | null {
  for (let i = 0; i < slots.length; i++) {
    for (let j = i + 1; j < slots.length; j++) {
      const a = slots[i]!;
      const b = slots[j]!;
      if (a.day !== b.day) continue;
      if (minutesOf(a.start) < minutesOf(b.start) + b.minutes && minutesOf(b.start) < minutesOf(a.start) + a.minutes) return [i, j];
    }
  }
  return null;
}

// The classes a schedule gives.

const weekdayOf = (day: string) => new Date(`${day}T00:00:00Z`).getUTCDay();
export const addDay = (day: string, n: number) => new Date(Date.parse(`${day}T00:00:00Z`) + n * DAY_MS).toISOString().slice(0, 10);

/** Start dates offered: today on, for a year. */
export function startDays(today: string, count = 366): string[] {
  return Array.from({ length: count }, (_, i) => addDay(today, i));
}

export interface PlannedClass {
  day: string;
  start: string;
  minutes: number;
}

/** Each class from the start date on, by the weekly times, until there are `count`. Mirrors how the API makes them. */
export function planClasses(slots: readonly Slot[], startDate: string, count: number): PlannedClass[] {
  const sorted = [...slots].sort((a, b) => a.start.localeCompare(b.start));
  const out: PlannedClass[] = [];
  if (!sorted.length || count < 1) return out;
  for (let i = 0, day = startDate; i <= 366 * 2 && out.length < count; i++, day = addDay(day, 1)) {
    for (const slot of sorted) {
      if (slot.day !== weekdayOf(day) || out.length >= count) continue;
      out.push({ day, start: slot.start, minutes: slot.minutes });
    }
  }
  return out;
}

/** Hours taught across the classes. */
export const hoursOf = (classes: readonly Pick<PlannedClass, 'minutes'>[]) => classes.reduce((sum, c) => sum + c.minutes, 0) / 60;

/** "24 classes over 12 weeks, last on Fri 28 Feb". */
export function planLine(classes: readonly PlannedClass[], dayLabel: (day: string) => string): string {
  if (!classes.length) return 'No classes yet. Tap the grid to pick the days and times.';
  const first = classes[0]!.day;
  const last = classes.at(-1)!.day;
  const weeks = Math.max(1, Math.ceil((Date.parse(`${last}T00:00:00Z`) - Date.parse(`${first}T00:00:00Z`) + DAY_MS) / (7 * DAY_MS)));
  const n = classes.length;
  return `${n} ${n === 1 ? 'class' : 'classes'} over ${weeks} ${weeks === 1 ? 'week' : 'weeks'}, first on ${dayLabel(first)}, last on ${dayLabel(last)}`;
}

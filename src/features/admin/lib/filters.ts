import { istDayKey } from '@/lib/booking/days';
import { fromIst } from '@/lib/dates';
import type { AuditFilter } from '@/types/admin';
import type { QueueFilter, QueueStatus, SupportCategory } from '@/types/support';

const DAY_MS = 86_400_000;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

const pad = (n: number) => String(n).padStart(2, '0');

export type WhenPreset = 'any' | 'today' | 'yesterday' | 'last7' | 'last30' | 'month';

/** A time filter: a preset counted from now, or whole India days from `from` to `to`, both `YYYY-MM-DD` and included. */
export type When = { kind: WhenPreset } | { kind: 'range'; from: string; to: string };

export const ANY_TIME: When = { kind: 'any' };

export const WHEN_PRESETS: readonly { key: WhenPreset; label: string }[] = [
  { key: 'any', label: 'Any time' },
  { key: 'today', label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: 'last7', label: 'Last 7 days' },
  { key: 'last30', label: 'Last 30 days' },
  { key: 'month', label: 'This month' },
];

/** The `YYYY-MM-DD` key `n` days after `key`. */
export const shiftDay = (key: string, n: number) => new Date(Date.parse(`${key}T00:00:00Z`) + n * DAY_MS).toISOString().slice(0, 10);

/** The first day of the month after the one `key` is in. */
const nextMonth = (key: string) => {
  const [y, m] = key.split('-').map(Number) as [number, number];
  return m === 12 ? `${y + 1}-01-01` : `${y}-${pad(m + 1)}-01`;
};

const span = (first: string, end: string) => ({ from: fromIst(first, '00:00'), to: fromIst(end, '00:00') });

/** The ISO bounds the API takes for a time filter: `from` inclusive, `to` exclusive, on India's midnights. */
export function whenRange(when: When, now: number): { from?: string; to?: string } {
  if (when.kind === 'any') return {};
  if (when.kind === 'range') {
    const [first, last] = when.from <= when.to ? [when.from, when.to] : [when.to, when.from];
    return span(first, shiftDay(last, 1));
  }
  const today = istDayKey(now);
  const tomorrow = shiftDay(today, 1);
  switch (when.kind) {
    case 'today':
      return span(today, tomorrow);
    case 'yesterday':
      return span(shiftDay(today, -1), today);
    case 'last7':
      return span(shiftDay(today, -6), tomorrow);
    case 'last30':
      return span(shiftDay(today, -29), tomorrow);
    case 'month':
      return span(`${today.slice(0, 8)}01`, nextMonth(today));
  }
}

/** "3 Nov", with the year when it is not this year in India. */
export function dayLabel(key: string, now: number): string {
  const [y, m, d] = key.split('-').map(Number) as [number, number, number];
  const year = istDayKey(now).slice(0, 4);
  return `${d} ${MONTHS[m - 1]}${String(y) === year ? '' : ` ${y}`}`;
}

/** What the time filter's button says: the preset's name, or "3 Nov – 10 Nov". */
export function whenLabel(when: When, now: number): string {
  if (when.kind !== 'range') return WHEN_PRESETS.find((p) => p.key === when.kind)!.label;
  const [first, last] = when.from <= when.to ? [when.from, when.to] : [when.to, when.from];
  return first === last ? dayLabel(first, now) : `${dayLabel(first, now)} – ${dayLabel(last, now)}`;
}

export interface AuditChoice {
  module: string;
  action: string;
  /** A user id. */
  actor: string;
  target: string;
  when: When;
}

export const NO_AUDIT_FILTER: AuditChoice = { module: '', action: '', actor: '', target: '', when: ANY_TIME };

export const auditFiltered = (c: AuditChoice) => !!(c.module || c.action || c.actor || c.target || c.when.kind !== 'any');

/** The audit log's query for these choices; unset ones are left out. */
export function auditQuery(c: AuditChoice, now: number): AuditFilter {
  return {
    ...(c.module ? { module: c.module } : {}),
    ...(c.action ? { action: c.action } : {}),
    ...(c.actor ? { actor: c.actor } : {}),
    ...(c.target ? { target: c.target } : {}),
    ...whenRange(c.when, now),
  };
}

export type Assigned = 'all' | 'me' | 'none';

export interface QueueChoice {
  status: QueueStatus;
  assigned: Assigned;
  topic: SupportCategory | 'all';
  /** A ticket number, as typed. */
  q: string;
}

export const QUEUE_DEFAULT: QueueChoice = { status: 'open', assigned: 'all', topic: 'all', q: '' };

export const queueFiltered = (c: QueueChoice) => c.status !== QUEUE_DEFAULT.status || c.assigned !== 'all' || c.topic !== 'all' || !!c.q.trim();

/** The help-ticket queue's query for these choices. */
export function queueQuery(c: QueueChoice): QueueFilter {
  const q = c.q.trim();
  return {
    status: c.status,
    ...(q ? { q } : {}),
    ...(c.assigned === 'all' ? {} : { assignee: c.assigned }),
    ...(c.topic === 'all' ? {} : { category: c.topic }),
  };
}

/** Whether a person's name or username contains `text`; a leading @ is ignored. */
export function matchesPerson(person: { name: string; username: string }, text: string): boolean {
  const q = text.trim().toLowerCase().replace(/^@/, '');
  if (!q) return true;
  return person.name.toLowerCase().includes(q) || person.username.toLowerCase().includes(q);
}

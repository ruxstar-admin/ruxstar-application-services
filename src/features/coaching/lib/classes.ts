import { dayText, timeText } from '@/features/events/lib/events';
import { istParts } from '@/lib/dates';
import type { ClassView, CoachingOrder, CourseMode, TimetableEntry } from '@/types/coaching';

/** Where an online class's join button stands at `now`. `open` with no link means fetch again: the API gives it once it's time. */
export type JoinState = { kind: 'none' } | { kind: 'later'; opensAt: string } | { kind: 'open'; link: string | null };

export function joinState(cls: Pick<ClassView, 'status' | 'joinFrom' | 'joinLink' | 'endsAt'>, mode: CourseMode, now: number): JoinState {
  if (mode !== 'online' || cls.status !== 'upcoming' || !cls.joinFrom) return { kind: 'none' };
  if (Date.parse(cls.endsAt) <= now) return { kind: 'none' };
  if (Date.parse(cls.joinFrom) > now) return { kind: 'later', opensAt: cls.joinFrom };
  return { kind: 'open', link: cls.joinLink };
}

/** "Join opens at 4:50 pm", "Join opens Sat, 16 Nov at 4:50 pm". */
export function opensText(opensAt: string, now: number): string {
  const same = istParts(opensAt).day === istParts(new Date(now).toISOString()).day;
  return same ? `Join opens at ${timeText(opensAt)}` : `Join opens ${dayText(opensAt)} at ${timeText(opensAt)}`;
}

/** The next class to come, cancelled ones skipped. */
export const nextClass = (classes: readonly ClassView[], now: number) =>
  classes.filter((c) => c.status === 'upcoming' && Date.parse(c.endsAt) > now).sort((a, b) => a.startsAt.localeCompare(b.startsAt))[0] ?? null;

/** Classes that changed and are still to come: moved or cancelled. */
export const changedClasses = (classes: readonly ClassView[], now: number) =>
  classes.filter((c) => Date.parse(c.startsAt) > now && (c.status === 'cancelled' || c.movedFrom));

/** "Moved from Mon, 6 Jan, 5:00 pm" or "Cancelled: Teacher unwell". */
export function changeText(cls: Pick<ClassView, 'status' | 'movedFrom' | 'cancelReason'>): string | null {
  if (cls.status === 'cancelled') return cls.cancelReason ? `Cancelled: ${cls.cancelReason}` : 'Cancelled';
  if (cls.movedFrom) return `Moved from ${dayText(cls.movedFrom)}, ${timeText(cls.movedFrom)}`;
  return null;
}

export interface CertificateProgress {
  /** Classes in the batch that aren't cancelled. */
  total: number;
  /** Classes to attend in all for the certificate. */
  required: number;
  /** More to attend from now. */
  more: number;
  /** Classes still to come. */
  left: number;
  /** Still possible with the classes left. */
  reachable: boolean;
}

/** How close a student is to the certificate: the share needed of the classes held, if every class goes ahead. */
export function certificateProgress(order: Pick<CoachingOrder, 'classes' | 'attendance'>, now: number): CertificateProgress {
  const live = order.classes.filter((c) => c.status !== 'cancelled');
  const total = live.length;
  const required = Math.ceil((order.attendance.needed * total) / 100);
  const left = live.filter((c) => Date.parse(c.endsAt) > now).length;
  const more = Math.max(0, required - order.attendance.attended);
  return { total, required, more, left, reachable: more <= left };
}

/** One line for the attendance card. */
export function attendanceLine(order: Pick<CoachingOrder, 'attendance'>): string {
  const { attended, held, percent } = order.attendance;
  if (!held) return 'No classes held yet.';
  return `Attended ${attended} of ${held} ${held === 1 ? 'class' : 'classes'} (${percent}%)`;
}

export function certificateLine(progress: CertificateProgress, needed: number): string {
  if (!progress.total) return `Attend ${needed}% of classes for a certificate.`;
  if (!progress.more) return `You've attended enough for the certificate (${needed}%). It's issued after the last class.`;
  if (!progress.reachable) return `${needed}% attendance is needed for the certificate, and there aren't enough classes left to reach it.`;
  return `${progress.more} more ${progress.more === 1 ? 'class' : 'classes'} to reach ${needed}% for the certificate.`;
}

/** Percent of `held`, rounded. */
export const percentOf = (attended: number, held: number) => (held ? Math.round((attended * 100) / held) : 0);

/** The refund line on an enrolment, in words. */
export function cancelText(order: Pick<CoachingOrder, 'status' | 'canCancel' | 'cancelUntil' | 'kind' | 'price'>): string {
  if (order.status === 'awaiting_payment') return 'Not paid yet. Cancel to give the place back.';
  if (!order.canCancel) return order.kind === 'demo' ? 'The demo class has started, so it can’t be cancelled.' : 'Classes have started, so there are no refunds now.';
  const until = order.cancelUntil ? `${dayText(order.cancelUntil)}, ${timeText(order.cancelUntil)}` : 'the first class';
  return order.price.total > 0 ? `Full refund, platform fee included, if you cancel before ${until}.` : `Cancel any time before ${until}.`;
}

export interface TimetableDay {
  day: string;
  entries: TimetableEntry[];
}

/** Classes by India's day, in time order. */
export function byDay(entries: readonly TimetableEntry[]): TimetableDay[] {
  const days = new Map<string, TimetableEntry[]>();
  for (const e of [...entries].sort((a, b) => a.class.startsAt.localeCompare(b.class.startsAt))) {
    const day = istParts(e.class.startsAt).day;
    days.set(day, [...(days.get(day) ?? []), e]);
  }
  return [...days.entries()].map(([day, list]) => ({ day, entries: list }));
}

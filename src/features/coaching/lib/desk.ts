import { Brand } from '@/constants/theme';
import type { DeskClass, RosterStudent } from '@/types/coaching';

/** Attendance opens this long before a class. */
export const MARK_EARLY_MS = 30 * 60_000;

/** Where a class's attendance stands, in a few words and a colour. */
export function markLine(cls: Pick<DeskClass, 'status' | 'marked' | 'present' | 'startsAt' | 'endsAt'>, now: number): { text: string; colour: string } {
  if (cls.status === 'cancelled') return { text: 'Cancelled', colour: Brand.error };
  if (cls.marked) return { text: `Attendance saved · ${cls.present} present`, colour: Brand.success };
  if (Date.parse(cls.startsAt) - MARK_EARLY_MS > now) return { text: 'Attendance opens 30 min before', colour: Brand.textMuted };
  if (Date.parse(cls.endsAt) <= now) return { text: 'Attendance not taken yet', colour: Brand.warning };
  return { text: 'Take attendance', colour: Brand.primarySoft };
}

/** Who to tick at the start: those marked present before. */
export const tickedOf = (students: readonly RosterStudent[]) => students.filter((s) => s.present === true).map((s) => s.orderId);

/** Every student marked: ticked ones present, the rest absent. */
export const marksOf = (students: readonly RosterStudent[], ticked: readonly string[]) => {
  const on = new Set(ticked);
  return students.map((s) => ({ orderId: s.orderId, present: on.has(s.orderId) }));
};

/** Ticks changed from what was saved, or nothing was saved yet. */
export const unsaved = (students: readonly RosterStudent[], ticked: readonly string[]) => {
  const on = new Set(ticked);
  return students.some((s) => s.present === null || s.present !== on.has(s.orderId));
};

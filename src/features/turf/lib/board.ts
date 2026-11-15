import { money } from '@/features/vendor/lib/pod';
import { boardKey, type BoardCell, type BoardColumn, type BoardRow, type BoardState } from '@/lib/booking/board';
import { clockText } from '@/lib/booking/slots';
import type { Board, BoardCourt, BoardSlot } from '@/types/turf';
import { slotLengthText } from './turf';

const minutesOf = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h! * 60 + m!;
};
const endMinutes = (hhmm: string) => minutesOf(hhmm) || 24 * 60;

export interface BoardModel {
  rows: BoardRow[];
  columns: BoardColumn[];
  cells: Record<string, BoardCell>;
  /** The slot behind each cell, by `boardKey`; a cell inside a longer slot points at that slot. */
  slotAt: Record<string, { court: BoardCourt; slot: BoardSlot }>;
}

/** What a slot shows on the board: state, then a few letters. */
export function cellOf(slot: BoardSlot): BoardCell {
  if (slot.state === 'booked') {
    const name = slot.booking?.customerName.trim().split(/\s+/)[0] || 'Booked';
    const mark = slot.booking?.arrival === 'arrived' ? '✓ ' : slot.booking?.arrival === 'no_show' ? '✗ ' : '';
    return { state: 'booked', label: `${mark}${name}` };
  }
  if (slot.state === 'held') return { state: 'held', label: 'Paying' };
  if (slot.state === 'blocked') return { state: 'blocked', label: slot.block?.note?.trim().split(/\s+/)[0] || 'Block' };
  if (slot.past) return { state: 'past' };
  return { state: slot.peak ? 'peak' : 'free', label: money(slot.price) };
}

/**
 * The day's board for `VendorBoard`: courts down the side, every slot start of any court across the top. A court with longer
 * slots fills the in-between columns with the same state and no label; a time it isn't open is `closed`.
 */
export function boardModel(board: Board): BoardModel {
  const starts = [...new Set(board.courts.flatMap((c) => c.slots.map((s) => s.start)))].sort((a, b) => minutesOf(a) - minutesOf(b));
  const columns = starts.map((start) => ({ key: start, label: clockText(start) }));
  const rows = board.courts.map((c) => ({
    key: c.id,
    label: c.name,
    subtitle: [slotLengthText(c.slotMinutes), c.status === 'paused' ? 'Paused' : null, c.open ? null : 'Closed today'].filter(Boolean).join(' · '),
  }));
  const cells: Record<string, BoardCell> = {};
  const slotAt: BoardModel['slotAt'] = {};
  const closed: BoardCell = { state: 'closed' };
  for (const court of board.courts) {
    for (const start of starts) {
      const at = minutesOf(start);
      const slot = court.slots.find((s) => minutesOf(s.start) <= at && at < endMinutes(s.end));
      const key = boardKey(court.id, start);
      if (!slot) {
        cells[key] = closed;
        continue;
      }
      const cell = cellOf(slot);
      cells[key] = slot.start === start ? cell : { state: cell.state };
      slotAt[key] = { court, slot };
    }
  }
  return { rows, columns, cells, slotAt };
}

/** The states the day's board shows, in legend order. */
export function boardLegend(cells: Readonly<Record<string, BoardCell>>): BoardState[] {
  const seen = new Set(Object.values(cells).map((c) => c.state));
  return (['free', 'peak', 'booked', 'held', 'blocked', 'past', 'closed'] as const).filter((s) => seen.has(s));
}

/** "12 booked · 3 blocked · 20 free · 4 arrived". */
export function totalsText(totals: Board['totals']): string {
  return [
    `${totals.booked} booked`,
    `${totals.free} free`,
    totals.blocked ? `${totals.blocked} blocked` : null,
    totals.arrived ? `${totals.arrived} arrived` : null,
    totals.noShow ? `${totals.noShow} no-show` : null,
  ]
    .filter(Boolean)
    .join(' · ');
}

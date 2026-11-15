import { boardKey, type BoardCell, type BoardColumn, type BoardRow, type BoardState } from '@/lib/booking/board';
import type { BedBoard, BoardBed, BoardRoom } from '@/types/stays';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

/** "Sat 21" for India's `YYYY-MM-DD`, short enough for a board column. */
export function columnDay(key: string): string {
  const d = new Date(Date.parse(`${key}T12:00:00Z`));
  return `${WEEKDAYS[d.getUTCDay()]} ${d.getUTCDate()}`;
}

/** The first word of a tenant's name, for a board cell. */
const firstName = (name: string) => name.trim().split(/\s+/)[0] || 'Tenant';

/** What a bed shows on one day: moved-in tenants get a tick, beds marked full say so. */
export function bedCell(bed: Pick<BoardBed, 'state' | 'reservation'>): BoardCell {
  if (bed.state === 'occupied') return { state: 'booked', label: `✓ ${firstName(bed.reservation?.tenantName ?? '')}` };
  if (bed.state === 'reserved') return { state: 'booked', label: firstName(bed.reservation?.tenantName ?? '') };
  if (bed.state === 'held') return { state: 'held', label: 'Paying' };
  if (bed.state === 'closed') return { state: 'blocked', label: 'Full' };
  return { state: 'free' };
}

export interface BedAt {
  room: BoardRoom;
  bed: BoardBed;
  date: string;
}

export interface BedMapModel {
  rows: BoardRow[];
  columns: BoardColumn[];
  cells: Record<string, BoardCell>;
  /** The bed and day behind each cell, by `boardKey`. */
  at: Record<string, BedAt>;
}

/**
 * Days of the property's board side by side for `VendorBoard`: every bed down the side, grouped by room, the days across.
 * Rooms and beds come from the first day; a bed missing on a later day shows as free.
 */
export function bedMapModel(days: readonly BedBoard[]): BedMapModel {
  const first = days[0];
  const rows: BoardRow[] = [];
  const cells: Record<string, BoardCell> = {};
  const at: BedMapModel['at'] = {};
  const columns = days.map((d) => ({ key: d.date, label: columnDay(d.date) }));
  if (!first) return { rows, columns, cells, at };

  for (const room of first.rooms) {
    const single = room.beds.length === 1;
    for (const bed of room.beds) {
      rows.push({
        key: bed.id,
        label: room.name,
        subtitle: [single ? (room.kind === 'private' ? 'Private room' : null) : `Bed ${bed.label}`, room.status === 'paused' ? 'Paused' : null].filter(Boolean).join(' · '),
      });
    }
  }
  for (const day of days) {
    for (const room of day.rooms) {
      for (const bed of room.beds) {
        const key = boardKey(bed.id, day.date);
        cells[key] = bedCell(bed);
        at[key] = { room, bed, date: day.date };
      }
    }
  }
  return { rows, columns, cells, at };
}

/** The states the bed map shows, in legend order. */
export function bedLegend(cells: Readonly<Record<string, BoardCell>>): BoardState[] {
  const seen = new Set(Object.values(cells).map((c) => c.state));
  return (['free', 'booked', 'held', 'blocked'] as const).filter((s) => seen.has(s));
}

/** "12 beds · 3 free · 5 moved in · 2 reserved · 1 marked full". */
export function bedTotalsText(totals: BedBoard['totals']): string {
  return [
    `${totals.beds} ${totals.beds === 1 ? 'bed' : 'beds'}`,
    `${totals.free} free`,
    totals.occupied ? `${totals.occupied} moved in` : null,
    totals.reserved ? `${totals.reserved} reserved` : null,
    totals.held ? `${totals.held} paying now` : null,
    totals.closed ? `${totals.closed} marked full` : null,
  ]
    .filter(Boolean)
    .join(' · ');
}

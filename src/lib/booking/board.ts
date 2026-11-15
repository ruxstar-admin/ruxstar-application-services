import type { SlotState } from './slots';

/**
 * A cell on the vendor board. `held` is unpaid and waiting; `selected` is for boards the vendor picks on (weekly schedules);
 * `closed` is outside opening hours; `past` is a free slot whose time has gone.
 */
export type BoardState = SlotState | 'held' | 'selected' | 'closed' | 'past';

/** A court, room, bed or batch. */
export interface BoardRow {
  key: string;
  label: string;
  subtitle?: string;
}

/** A time or a day. */
export interface BoardColumn {
  key: string;
  label: string;
}

export interface BoardCell {
  state: BoardState;
  /** A few letters: "Ravi", "₹800", "3/4". */
  label?: string;
}

/** Cells are looked up by `boardKey(row.key, column.key)`; a missing cell is free and empty. */
export const boardKey = (rowKey: string, columnKey: string) => `${rowKey}|${columnKey}`;

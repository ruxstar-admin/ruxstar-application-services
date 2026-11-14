/** What a slot looks like to the customer. `few` and `peak` can still be picked; `booked` and `blocked` can't. */
export type SlotState = 'free' | 'few' | 'peak' | 'booked' | 'blocked';

export interface Slot {
  key: string;
  /** India's clock, `HH:MM`. */
  start: string;
  /** India's clock, `HH:MM`; `24:00` or `00:00` for midnight. */
  end: string;
  /** Paise. */
  price: number;
  state: SlotState;
  /** Places left, shown on `few` slots. */
  left?: number;
}

export const isPickable = (slot: Pick<Slot, 'state'>) => slot.state === 'free' || slot.state === 'few' || slot.state === 'peak';

const minutesOf = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h! * 60 + m!;
};
const endMinutes = (hhmm: string) => minutesOf(hhmm) || 24 * 60;

/** True when `b` starts the moment `a` ends. */
const touches = (a: Slot, b: Slot) => endMinutes(a.end) === minutesOf(b.start);

/**
 * The selection after tapping `key`. Picked slots always run back to back: a slot next to the selection extends it,
 * any other slot starts again, tapping either end shrinks it, and tapping one in the middle ends the selection there.
 * `slots` are in time order; `selected` keys are in time order too.
 */
export function toggleSlot(slots: readonly Slot[], selected: readonly string[], key: string): string[] {
  const at = slots.findIndex((s) => s.key === key);
  const slot = slots[at];
  if (!slot || !isPickable(slot)) return [...selected];
  if (!selected.length) return [key];

  const first = slots.findIndex((s) => s.key === selected[0]);
  const last = slots.findIndex((s) => s.key === selected[selected.length - 1]);
  if (first < 0 || last < 0) return [key];

  if (at >= first && at <= last) {
    if (first === last) return [];
    if (at === first) return selected.slice(1);
    return selected.slice(0, at - first);
  }
  if (at === last + 1 && touches(slots[last]!, slot)) return [...selected, key];
  if (at === first - 1 && touches(slot, slots[first]!)) return [key, ...selected];
  return [key];
}

/**
 * The selection still valid after availability reloads: the first back-to-back run of picked slots that are still free.
 * Returns the same array when nothing changed. Derive it during render rather than syncing state in an effect.
 */
export function keepSelection(slots: readonly Slot[], selected: string[]): string[] {
  const kept: string[] = [];
  let prev: Slot | undefined;
  for (const slot of slots) {
    if (!selected.includes(slot.key)) {
      if (kept.length) break;
      continue;
    }
    if (!isPickable(slot) || (prev && !touches(prev, slot))) break;
    kept.push(slot.key);
    prev = slot;
  }
  return kept.length === selected.length ? selected : kept;
}

const parts = (hhmm: string) => {
  const total = minutesOf(hhmm) % (24 * 60);
  const h = Math.floor(total / 60);
  const m = total % 60;
  return { hour: h % 12 === 0 ? 12 : h % 12, minutes: m ? `:${String(m).padStart(2, '0')}` : '', half: h < 12 ? 'am' : 'pm' };
};

/** "7 pm", "7:30 am", "12 am" for midnight. */
export function clockText(hhmm: string): string {
  const p = parts(hhmm);
  return `${p.hour}${p.minutes} ${p.half}`;
}

/** "7–9 pm", "11 am–1 pm", "10:30–11:30 pm". */
export function rangeText(start: string, end: string): string {
  const a = parts(start);
  const b = parts(end);
  return a.half === b.half ? `${a.hour}${a.minutes}–${b.hour}${b.minutes} ${b.half}` : `${clockText(start)}–${clockText(end)}`;
}

export interface SelectionSummary {
  count: number;
  /** Paise. */
  total: number;
  /** "2 slots · 7–9 pm", or "" when nothing is picked. */
  text: string;
}

/** What the booking bar shows for the picked slots. */
export function selectionSummary(slots: readonly Slot[], selected: readonly string[]): SelectionSummary {
  const picked = slots.filter((s) => selected.includes(s.key));
  if (!picked.length) return { count: 0, total: 0, text: '' };
  const total = picked.reduce((sum, s) => sum + s.price, 0);
  const noun = picked.length === 1 ? 'slot' : 'slots';
  return { count: picked.length, total, text: `${picked.length} ${noun} · ${rangeText(picked[0]!.start, picked[picked.length - 1]!.end)}` };
}

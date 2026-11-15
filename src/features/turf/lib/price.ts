import type { AddOn, AddOnPick } from '@/types/turf';

/** Add-on quantities by add-on id. */
export type AddOnCounts = Readonly<Record<string, number>>;

export const pickedAddOns = (counts: AddOnCounts): AddOnPick[] =>
  Object.entries(counts)
    .filter(([, quantity]) => quantity > 0)
    .map(([id, quantity]) => ({ id, quantity }));

/** What one add-on adds to one date: per booking once, per slot for each slot. */
export const addOnCost = (addOn: Pick<AddOn, 'price' | 'per'>, quantity: number, slots: number) => addOn.price * quantity * (addOn.per === 'slot' ? slots : 1);

export interface TurfPrice {
  /** The picked slots on one date. */
  slots: number;
  /** Add-ons on one date. */
  extras: number;
  /** Slots and add-ons on one date. */
  perDate: number;
  weeks: number;
  /** Every date before the coupon and fee. */
  items: number;
  discount: number;
  fee: number;
  total: number;
}

/**
 * The booking's price the way the API works it out: each date is the slots plus add-ons, times the weeks; a coupon comes off
 * that; the platform fee is charged once per booking.
 */
export function turfPrice(input: {
  slotPrices: readonly number[];
  addOns: readonly AddOn[];
  counts: AddOnCounts;
  weeks: number;
  platformFee: number;
  discount?: number;
}): TurfPrice {
  const slots = input.slotPrices.reduce((sum, p) => sum + p, 0);
  const n = input.slotPrices.length;
  const extras = n ? input.addOns.reduce((sum, a) => sum + addOnCost(a, input.counts[a.id] ?? 0, n), 0) : 0;
  const weeks = Math.max(1, Math.floor(input.weeks));
  const perDate = slots + extras;
  const items = perDate * weeks;
  const discount = Math.min(Math.max(input.discount ?? 0, 0), items);
  const fee = items > 0 ? input.platformFee : 0;
  return { slots, extras, perDate, weeks, items, discount, fee, total: items - discount + fee };
}

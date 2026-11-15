import type { RoomAvailability, RoomPrices, RoomView, StayPick, StayUnit, StaysRules } from '@/types/stays';

/** How a room is let, months first. */
export const unitsOf = (prices: RoomPrices): StayUnit[] => (['month', 'night'] as const).filter((u) => prices[u] !== null);

/** The most months or nights one reservation can pay for now. */
export const maxUnits = (unit: StayUnit, rules: Pick<StaysRules, 'maxMonths' | 'maxNights'>) => Math.max(1, unit === 'month' ? rules.maxMonths : rules.maxNights);

/** Keeps a count of months or nights inside 1 and the rules' most. */
export const clampUnits = (n: number, unit: StayUnit, rules: Pick<StaysRules, 'maxMonths' | 'maxNights'>) =>
  Math.min(Math.max(1, Math.floor(n) || 1), maxUnits(unit, rules));

/** What a reservation of `room` takes: one bed of a shared room, or the whole room. */
export type Spot = { kind: 'bed'; bedId: string } | { kind: 'whole' };

/** The body for availability, offers and reserving: months only for a monthly stay, nights only for nights. */
export function stayPickOf(moveIn: string, unit: StayUnit, units: number, spot?: Spot | null): StayPick {
  return {
    moveIn,
    stay: unit,
    ...(unit === 'month' ? { months: units } : { nights: units }),
    ...(spot?.kind === 'bed' ? { bedId: spot.bedId } : spot?.kind === 'whole' ? { whole: true } : {}),
  };
}

/** Free beds of a room for the stay asked about. A paused room has none. */
export const freeBeds = (room: Pick<RoomAvailability, 'beds' | 'status'>) => (room.status === 'paused' ? [] : room.beds.filter((b) => b.state === 'free'));

/** What a spot costs for the stay, before coupons and the fee; null when it can't be had. */
export function spotTotal(room: Pick<RoomAvailability, 'kind' | 'bedTotal' | 'roomTotal'>, spot: Spot | null): number | null {
  if (!spot) return null;
  if (room.kind === 'private' || spot.kind === 'whole') return room.roomTotal;
  return room.bedTotal;
}

/** Whether a picked spot is still free in fresh availability; a whole room needs every bed. */
export function spotFree(room: RoomAvailability | undefined, spot: Spot | null): boolean {
  if (!room || !spot || room.status === 'paused') return false;
  if (room.kind === 'private' || spot.kind === 'whole') return room.roomTotal !== null;
  return room.beds.some((b) => b.id === spot.bedId && b.state === 'free');
}

/** A private room is always whole; a shared one can be whole only when the owner allows it. */
export const canTakeWhole = (room: Pick<RoomView, 'kind' | 'wholeRoom'>) => room.kind === 'private' || room.wholeRoom;

export interface StayPrice {
  items: number;
  discount: number;
  fee: number;
  total: number;
}

/** The reservation's price the way the API works it out: the stay, less the coupon, plus the platform fee once. */
export function stayPrice(items: number, platformFee: number, discount = 0): StayPrice {
  const safe = Math.max(0, items);
  const off = Math.min(Math.max(discount, 0), safe);
  const fee = safe > 0 ? platformFee : 0;
  return { items: safe, discount: off, fee, total: safe - off + fee };
}

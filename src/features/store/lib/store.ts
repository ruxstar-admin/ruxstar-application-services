import type { TimelineStep } from '@/components/ui/StatusTimeline';
import { money } from '@/features/vendor/lib/pod';
import type {
  MoveStatus,
  ProductStatus,
  ReturnReason,
  StoreDeliveryFee,
  StoreMethod,
  StoreOrderLine,
  StoreOrderStatus,
  StoreReturn,
  StoreSetup,
} from '@/types/store';

/** The shop business types, as Discover's chips and cards name them. */
export const STORE_TYPE_LABEL: Record<string, string> = {
  clothing: 'Clothing & footwear',
  electronics: 'Electronics & mobiles',
  grocery: 'Grocery & daily needs',
  gifts: 'Gifts & flowers',
  bakery: 'Bakery & sweets',
  general_store: 'General store',
};
export const STORE_TYPES = Object.keys(STORE_TYPE_LABEL);
export const storeTypeLabel = (type: string) => STORE_TYPE_LABEL[type] ?? 'Local shop';

/** Whole percent off the MRP; null without a higher MRP. */
export const percentOff = (price: number, mrp: number | null | undefined) => (mrp && mrp > price ? Math.round(((mrp - price) / mrp) * 100) : null);

/** "₹699, MRP ₹999, 30% off" for screen readers; the screen strikes the MRP. */
export function priceSpoken(price: number, mrp: number | null | undefined, from = false): string {
  const off = percentOff(price, mrp);
  return `${from ? 'From ' : ''}${money(price)}${off && mrp ? `, MRP ${money(mrp)}, ${off}% off` : ''}`;
}

/** What delivery costs at `km` road km: the base, then per km after the included km. */
export const feeFor = (fee: StoreDeliveryFee, km: number) => fee.base + Math.max(0, Math.ceil(km) - fee.includedKm) * fee.perKm;

/** "Free delivery", "₹40 delivery", or "₹40 for the first 3 km, then ₹10 a km". */
export function deliveryFeeText(fee: StoreDeliveryFee): string {
  if (!fee.base && !fee.perKm) return 'Free delivery';
  if (!fee.perKm) return `${money(fee.base)} delivery`;
  if (!fee.base && !fee.includedKm) return `${money(fee.perKm)} a km for delivery`;
  return `${fee.base ? money(fee.base) : 'Free'} for the first ${fee.includedKm} km, then ${money(fee.perKm)} a km`;
}

/** "Delivers anywhere in Bengaluru" or "Delivers within 5 km". */
export const areaText = (setup: Pick<StoreSetup, 'radiusKm'>, city: string) => (setup.radiusKm ? `Delivers within ${setup.radiusKm} km` : `Delivers anywhere in ${city}`);

/** "Delivery or pickup", "Delivery only", "Pickup only". */
export function methodsText(s: { delivery: boolean; pickup: boolean }): string {
  if (s.delivery && s.pickup) return 'Delivery or pickup';
  return s.delivery ? 'Delivery only' : 'Pickup only';
}

type Tone = 'neutral' | 'accent' | 'success' | 'warning' | 'error';

export const ORDER_STATUS: Record<StoreOrderStatus, { label: string; tone: Tone }> = {
  awaiting_payment: { label: 'Waiting for payment', tone: 'warning' },
  paid: { label: 'Waiting for the shop', tone: 'accent' },
  accepted: { label: 'Accepted', tone: 'accent' },
  packed: { label: 'Packed', tone: 'accent' },
  out_for_delivery: { label: 'Out for delivery', tone: 'accent' },
  ready_for_pickup: { label: 'Ready for pickup', tone: 'success' },
  delivered: { label: 'Delivered', tone: 'success' },
  cancelled: { label: 'Cancelled', tone: 'neutral' },
};

export const PRODUCT_STATUS: Record<ProductStatus, { label: string; tone: Tone }> = {
  live: { label: 'On sale', tone: 'success' },
  hidden: { label: 'Off sale', tone: 'neutral' },
  removed: { label: 'Taken down', tone: 'error' },
};

export const RETURN_STATUS: Record<StoreReturn['status'], { label: string; tone: Tone }> = {
  requested: { label: 'Return asked', tone: 'warning' },
  approved: { label: 'Return accepted', tone: 'accent' },
  rejected: { label: 'Return turned down', tone: 'error' },
  refunded: { label: 'Returned', tone: 'neutral' },
};

/** The one badge an order shows: an open or finished return beats Delivered, and a pickup reads Picked up. */
export function statusOf(o: { status: StoreOrderStatus; method: StoreMethod; return: Pick<StoreReturn, 'status'> | null }): { label: string; tone: Tone } {
  if (o.return) return RETURN_STATUS[o.return.status];
  if (o.status === 'delivered' && o.method === 'pickup') return { label: 'Picked up', tone: 'success' };
  return ORDER_STATUS[o.status];
}

/** The desk's button for each step it can move an order to. */
export function moveLabel(status: MoveStatus, method: StoreMethod): string {
  switch (status) {
    case 'accepted':
      return 'Accept order';
    case 'packed':
      return 'Mark packed';
    case 'out_for_delivery':
      return 'Out for delivery';
    case 'ready_for_pickup':
      return 'Ready for pickup';
    case 'delivered':
      return method === 'pickup' ? 'Picked up' : 'Mark delivered';
  }
}

export const MOVES: readonly MoveStatus[] = ['accepted', 'packed', 'out_for_delivery', 'ready_for_pickup', 'delivered'];
export const isMove = (s: StoreOrderStatus): s is MoveStatus => (MOVES as readonly string[]).includes(s);

/** Placed, then the shop's steps, to delivered or picked up, with when each happened. */
export function orderTimeline(o: { method: StoreMethod; paidAt: string | null; timeline: { status: StoreOrderStatus; at: string }[] }): TimelineStep[] {
  const at = (s: StoreOrderStatus) => o.timeline.find((t) => t.status === s)?.at;
  const pickup = o.method === 'pickup';
  return [
    { key: 'paid', label: 'Order placed', at: o.paidAt ?? at('paid') },
    { key: 'accepted', label: 'The shop accepted it', at: at('accepted') },
    { key: 'packed', label: 'Packed', at: at('packed') },
    pickup ? { key: 'ready_for_pickup', label: 'Ready for pickup', at: at('ready_for_pickup') } : { key: 'out_for_delivery', label: 'Out for delivery', at: at('out_for_delivery') },
    { key: 'delivered', label: pickup ? 'Picked up' : 'Delivered', at: at('delivered') },
  ];
}

/** "Blue tee", "Blue tee and 2 more". */
export const linesText = (lines: readonly Pick<StoreOrderLine, 'title'>[]) =>
  lines.length > 1 ? `${lines[0]!.title} and ${lines.length - 1} more` : (lines[0]?.title ?? '');

export const itemsCount = (lines: readonly Pick<StoreOrderLine, 'quantity'>[]) => {
  const n = lines.reduce((s, l) => s + l.quantity, 0);
  return `${n} item${n === 1 ? '' : 's'}`;
};

// Returns.

export const RETURN_REASONS: { key: ReturnReason; label: string }[] = [
  { key: 'wrong_item', label: 'Wrong item' },
  { key: 'damaged', label: 'Arrived damaged' },
  { key: 'not_as_described', label: 'Not as described' },
  { key: 'changed_mind', label: 'Changed my mind' },
  { key: 'other', label: 'Something else' },
];
export const returnReasonLabel = (reason: ReturnReason) => RETURN_REASONS.find((r) => r.key === reason)?.label ?? 'Something else';

/** The shop pays the trip back when it got it wrong; otherwise the customer does. */
export const tripPaidBy = (reason: ReturnReason): 'shop' | 'customer' => (reason === 'wrong_item' || reason === 'damaged' ? 'shop' : 'customer');

/**
 * What a return gives back, as the API works it out: the items' value less their part of the discount, and when the customer
 * pays the trip on a delivered order, one delivery fee less too.
 */
export function returnSplit(
  o: { method: StoreMethod; price: { items: number; delivery: number; discount: number }; lines: readonly Pick<StoreOrderLine, 'id' | 'unitPrice'>[] },
  picked: readonly { lineId: string; quantity: number }[],
  reason: ReturnReason,
): { value: number; discount: number; tripFee: number; amount: number } {
  const value = picked.reduce((s, p) => s + (o.lines.find((l) => l.id === p.lineId)?.unitPrice ?? 0) * p.quantity, 0);
  const discount = o.price.items ? Math.round((o.price.discount * value) / o.price.items) : 0;
  const tripFee = tripPaidBy(reason) === 'customer' && o.method === 'delivery' ? Math.min(o.price.delivery, value - discount) : 0;
  return { value, discount, tripFee, amount: value - discount - tripFee };
}

/** Who pays the trip back, in the customer's words. */
export function tripText(reason: ReturnReason, method: StoreMethod, deliveryFee: number): string {
  if (method === 'pickup') return 'Bring it back to the shop.';
  if (tripPaidBy(reason) === 'shop') return 'The shop got it wrong, so the shop pays for the trip back.';
  return deliveryFee ? `The trip back costs one delivery fee, ${money(deliveryFee)}, taken off the refund.` : 'The trip back is free, as delivery was.';
}

const HOUR_MS = 60 * 60_000;

/** "2 days left to ask for a return", "5 hours left…", or null once it's closed. */
export function returnWindowText(returnUntil: string | null, now: number): string | null {
  if (!returnUntil) return null;
  const left = Date.parse(returnUntil) - now;
  if (left <= 0) return null;
  if (left < HOUR_MS) return 'Less than an hour left to ask for a return';
  if (left < 24 * HOUR_MS) {
    const h = Math.floor(left / HOUR_MS);
    return `${h} hour${h === 1 ? '' : 's'} left to ask for a return`;
  }
  const d = Math.floor(left / (24 * HOUR_MS));
  return `${d} day${d === 1 ? '' : 's'} left to ask for a return`;
}

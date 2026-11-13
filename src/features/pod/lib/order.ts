import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { money, OPTION_LABELS } from '@/features/vendor/lib/pod';
import type { Order, OrderPrice, OrderProblem, OrderRefund, OrderStatus, ProblemKind, ShopOrder, ShopStatus } from '@/types/order';
import type { ShopProduct } from '@/types/shop';

export const STATUS_LABEL: Record<OrderStatus, string> = {
  awaiting_payment: 'Waiting for payment',
  placed: 'Waiting for the shop',
  accepted: 'Accepted',
  printing: 'Printing',
  ready: 'Ready',
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered',
  rejected: 'Turned down',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
};

/** The vendor's words for the same steps. */
export const SHOP_STATUS_LABEL: Record<OrderStatus, string> = { ...STATUS_LABEL, placed: 'New', awaiting_payment: 'Not paid' };

export const STATUS_TONE: Record<OrderStatus, 'neutral' | 'accent' | 'success' | 'warning' | 'error'> = {
  awaiting_payment: 'warning',
  placed: 'accent',
  accepted: 'accent',
  printing: 'accent',
  ready: 'accent',
  out_for_delivery: 'accent',
  delivered: 'success',
  rejected: 'error',
  cancelled: 'neutral',
  refunded: 'neutral',
};

export const isFinished = (status: OrderStatus) => ['delivered', 'rejected', 'cancelled', 'refunded'].includes(status);
/** Turned down, cancelled or refunded in full: nothing left to make. */
export const isClosed = (status: OrderStatus) => status === 'rejected' || status === 'cancelled' || status === 'refunded';

export const PROBLEM_LABEL: Record<ProblemKind, string> = {
  not_received: "It didn't arrive",
  wrong_item: 'Wrong print',
  poor_quality: 'Poor print quality',
  damaged: 'Arrived damaged',
  other: 'Something else',
};
export const PROBLEM_KINDS = Object.keys(PROBLEM_LABEL) as ProblemKind[];
export const PROBLEM_PHOTOS_MAX = 3;

/** "Thu, 14 Nov" */
export const dayLabel = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });

export const refundLine = (refund: OrderRefund) =>
  refund.status === 'done' ? `${money(refund.amount)} refunded to how you paid. Banks take up to 7 days to show it.` : `Refunding ${money(refund.amount)}…`;

/** What Ruxstar decided, in the customer's words or the shop's. */
export function resolutionLine(problem: OrderProblem, forShop: boolean): string {
  const r = problem.resolution;
  if (!r) return forShop ? 'Ruxstar is looking into it. Your share is held until then.' : 'Ruxstar is looking into it and will reply here.';
  if (r.outcome === 'dismissed') return `Closed without a refund: ${r.note}`;
  return `${money(r.amount)} refunded${forShop && r.outcome === 'partial' ? ' from your share' : ''}: ${r.note}`;
}

const PATH: OrderStatus[] = ['placed', 'accepted', 'printing', 'ready', 'out_for_delivery', 'delivered'];

/** The progress list: every step on the way, with when it happened. Skipped steps count as done. */
export function progressOf(order: Pick<Order, 'status' | 'timeline'>) {
  const reached = PATH.indexOf(order.status);
  return PATH.map((status, i) => ({
    key: status,
    label: STATUS_LABEL[status],
    at: i <= reached ? order.timeline.find((t) => PATH.indexOf(t.status) >= i)?.at : undefined,
  }));
}

/** "Size XL · Double-sided · Colour" */
export function choiceLine(order: Pick<Order, 'options' | 'colour'>): string {
  const parts = Object.entries(order.options).map(([option, value]) =>
    option === 'doubleSided' ? value : `${OPTION_LABELS[option] ?? option} ${value}`,
  );
  if (order.colour) parts.push(order.colour === 'bw' ? 'Black & white' : 'Colour');
  return parts.join(' · ');
}

export const quantityLine = (order: Pick<Order, 'pricing' | 'quantity' | 'productLabel'>) =>
  order.pricing === 'per_page' ? `${order.quantity} ${order.quantity === 1 ? 'copy' : 'copies'}` : `${order.productLabel} × ${order.quantity}`;

/** Itemised lines for a price, in paise. */
export function priceLines(price: OrderPrice, pricing: 'per_unit' | 'per_page') {
  const unit = pricing === 'per_page' ? (price.units === 1 ? 'page' : 'pages') : price.units === 1 ? 'piece' : 'pieces';
  const lines = [{ label: `${price.units} ${unit} × ${money(price.unitPrice)}`, amount: price.units * price.unitPrice }];
  if (price.extrasPerUnit) lines.push({ label: `Extras, ${money(price.extrasPerUnit)} each`, amount: price.units * price.extrasPerUnit });
  if (price.platformFee) lines.push({ label: 'Platform fee', amount: price.platformFee });
  return lines;
}

/** Size, or paper size for documents: an order can't be priced without it. */
export const requiredOption = (product: ShopProduct) => (product.pricing === 'per_page' ? 'paperSize' : 'size');

/** What the shop can move a paid order to next. Turning down is only before accepting. */
export function nextSteps(order: Pick<ShopOrder, 'status'>): ShopStatus[] {
  switch (order.status) {
    case 'placed':
      return ['accepted', 'rejected'];
    case 'accepted':
      return ['printing', 'ready'];
    case 'printing':
      return ['ready'];
    case 'ready':
      return ['out_for_delivery', 'delivered'];
    case 'out_for_delivery':
      return ['delivered'];
    default:
      return [];
  }
}

export const STEP_ACTION: Record<ShopStatus, string> = {
  accepted: 'Accept order',
  rejected: 'Turn down',
  printing: 'Start printing',
  ready: 'Mark ready',
  out_for_delivery: 'Out for delivery',
  delivered: 'Mark delivered',
};

/** Where the checkout page sends the customer back to: a screen that closes itself. */
export const checkoutReturn = () => Linking.createURL('/pod/paid');

/** Opens the checkout page in the system browser and waits until it sends the customer back or they close it. */
export async function openCheckout(url: string): Promise<void> {
  await WebBrowser.openAuthSessionAsync(url, checkoutReturn());
}

export const fileSize = (bytes: number) => (bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`);

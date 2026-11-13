import type { PodProduct } from './business';
import type { AppliedCoupon, CouponOffer } from './coupon';
import type { TeamPermission } from './team';

/** POST /v1/pod/files: a file the customer uploaded to print. */
export interface PrintFile {
  id: string;
  name: string;
  contentType: 'application/pdf' | 'image/jpeg' | 'image/png';
  bytes: number;
  /** PDF pages; 1 for a photo. */
  pages: number;
}

/**
 * `placed` is paid and waiting for the shop. `rejected`, and `cancelled` after payment, are refunded in full.
 * `refunded` is an accepted order Ruxstar refunded in full.
 */
export type OrderStatus =
  | 'awaiting_payment'
  | 'placed'
  | 'accepted'
  | 'printing'
  | 'ready'
  | 'out_for_delivery'
  | 'delivered'
  | 'rejected'
  | 'cancelled'
  | 'refunded';

/** Paise. Partial refunds come out of the shop's share and the order carries on. */
export interface OrderRefund {
  amount: number;
  kind: 'full' | 'partial';
  reason: string | null;
  status: 'pending' | 'done';
  at: string;
}

export type ProblemKind = 'not_received' | 'wrong_item' | 'poor_quality' | 'damaged' | 'other';

/** What a customer reported. Photo links work for 10 minutes. */
export interface OrderProblem {
  kind: ProblemKind;
  note: string;
  photos: { id: string; url: string }[];
  status: 'open' | 'resolved';
  reportedAt: string;
  resolution: { outcome: 'refunded' | 'partial' | 'dismissed'; amount: number; note: string; at: string } | null;
}

export interface OrderAddress {
  name: string;
  /** 10 digits. */
  phone: string;
  line: string;
  city: string;
  pincode: string;
}

/** What the customer picks. `options` is option → value; documents also need `colour`. */
export interface OrderChoice {
  shopId: string;
  product: PodProduct;
  options: Record<string, string>;
  colour?: 'bw' | 'color';
  quantity: number;
  fileIds: string[];
  /** Any case. The API checks it and takes it off the items. */
  couponCode?: string;
}

/** Paise. `units` is pieces, or pages times copies for documents. `total` is items less the discount, plus the platform fee. */
export interface OrderPrice {
  units: number;
  unitPrice: number;
  extrasPerUnit: number;
  items: number;
  discount: number;
  coupon: AppliedCoupon | null;
  platformFee: number;
  total: number;
}

export interface Quote extends OrderPrice {
  pages: number;
  minOrder: number;
  turnaroundDays: number;
  /** Why `couponCode` can't be used; the price is then without it. */
  couponProblem: string | null;
  /** Coupons the customer can pick, best first. */
  offers: CouponOffer[];
}

export interface Order {
  id: string;
  orderNo: number;
  shop: { id: string; name: string };
  product: PodProduct;
  productLabel: string;
  pricing: 'per_unit' | 'per_page';
  options: Record<string, string>;
  colour: 'bw' | 'color' | null;
  quantity: number;
  files: PrintFile[];
  address: OrderAddress;
  note: string | null;
  status: OrderStatus;
  timeline: { status: OrderStatus; at: string }[];
  paidAt: string | null;
  /** Oldest first. */
  refunds: OrderRefund[];
  /** Paise, all refunds added up. */
  refunded: number;
  /** Why the shop turned it down, or why it was cancelled. */
  reason: string | null;
  /** While placed: cancelled and refunded if the shop hasn't accepted by then. */
  acceptBy: string | null;
  /** When the shop promised it ready: accepted plus the ready-in days. */
  readyBy: string | null;
  deliveredAt: string | null;
  /** The customer can report a problem now: within 48 hours of delivery, or once it is late. */
  canReport: boolean;
  reportUntil: string | null;
  /** The customer can write or change a review until then: 30 days after delivery. Null when it can't be reviewed now. */
  reviewUntil: string | null;
  problem: OrderProblem | null;
  createdAt: string;
  updatedAt: string;
  price: OrderPrice;
}

/** The same order as the shop sees it, with Ruxstar's commission and the shop's payout. */
export interface ShopOrder extends Omit<Order, 'price'> {
  /**
   * `payoutLeft` is the payout less partial refunds. With the shop's own coupon, commission is on the items
   * less the discount and the discount comes out of the payout; with Ruxstar's, the payout is as if there were none.
   */
  price: OrderPrice & { commissionBps: number; commission: number; payout: number; payoutLeft: number };
  /** When the shop's share becomes available: 48 hours after delivery, later while a problem is open. */
  releaseAt: string | null;
  releasedAt: string | null;
  /** Paise: the most the shop can refund now. */
  refundable: number;
}

/**
 * A shop's order as someone on its team sees it. The shop's money is null without `earnings.view`,
 * and `refundable` is 0 without `orders.refund`.
 */
export interface TeamOrder extends Omit<ShopOrder, 'price'> {
  price: OrderPrice & { commissionBps: number | null; commission: number | null; payout: number | null; payoutLeft: number | null };
  /** The place at the shop it was opened through. */
  placeId: string;
  permissions: TeamPermission[];
}

/** An order with a reported problem, as the Ruxstar console sees it. */
export interface StaffOrder extends ShopOrder {
  customer: { id: string; name: string; username: string | null };
  vendor: { id: string; name: string };
}

export type ShopOrderView = 'new' | 'active' | 'past';
export type ShopStatus = 'accepted' | 'printing' | 'ready' | 'out_for_delivery' | 'delivered' | 'rejected';

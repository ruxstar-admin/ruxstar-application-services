/**
 * Local shops: `/v1/shop`, its desk `/v1/shop/desk`, the owner's `/v1/vendor` shop and product routes and the console's
 * `/v1/ruxstar/shop`. The backend module is `shop`; the app calls it store so it never mixes with the print shop. Amounts are paise.
 */
import type { AppliedCoupon, CouponCheck } from './coupon';
import type { InvoiceRef } from './invoice';
import type { CustomerDelivery, GeoPoint, OrderAddress, ShopDelivery } from './order';
import type { Rating } from './review';

export interface StorePhoto {
  url: string;
  width: number;
  height: number;
}

/** Paise: `base` covers the first `includedKm`, then `perKm` for each km after. All 0 is free delivery. */
export interface StoreDeliveryFee {
  base: number;
  includedKm: number;
  perKm: number;
}

/** How a shop sells: delivery in its city (or a radius), pickup, its fee, minimum order and returns. */
export interface StoreSetup {
  delivery: boolean;
  pickup: boolean;
  /** Road km it delivers to; null for anywhere in its city. */
  radiusKm: number | null;
  deliveryFee: StoreDeliveryFee;
  minOrder: number;
  /** Takes returns within Ruxstar's return days; false is "No returns". */
  returns: boolean;
  notes: string | null;
}

/** GET /v1/shop: a shop on Discover. `type` is one of the shop business types. */
export interface StoreCard {
  id: string;
  name: string;
  type: string;
  photoUrl: string | null;
  city: string;
  area: string | null;
  open: boolean;
  delivery: boolean;
  pickup: boolean;
  /** The return rule in one sentence. */
  returnRule: string;
  rating: Rating;
}

export interface StoresQuery {
  city?: string;
  type?: string;
  q?: string;
}

export interface StoreDetail extends StoreCard {
  description: string | null;
  photos: StorePhoto[];
  phone: string | null;
  address: string;
  point: GeoPoint | null;
  setup: StoreSetup;
  /** Days after delivery to ask for a return; null for no returns. */
  returnDays: number | null;
  canOrder: boolean;
  whyNot: string | null;
  /** Live products. */
  products: number;
}

/** One combination sold, with `values` in the options' order; empty without options. */
export interface Variant {
  id: string;
  values: string[];
  price: number;
  mrp: number | null;
  stock: number;
  sku: string | null;
}

export interface ProductOption {
  name: string;
  values: string[];
}

/** `hidden`: the shop took it off sale. `removed`: Ruxstar took it down. */
export type ProductStatus = 'live' | 'hidden' | 'removed';

export interface ProductCard {
  id: string;
  title: string;
  photo: StorePhoto | null;
  business: { id: string; name: string };
  city: string;
  priceFrom: number;
  /** The MRP of the cheapest variant. */
  mrpFrom: number | null;
  inStock: boolean;
  rating: Rating;
}

export interface ProductsQuery {
  city?: string;
  shop?: string;
  q?: string;
  inStock?: boolean;
}

export interface ProductDetail extends ProductCard {
  description: string | null;
  options: ProductOption[];
  /** A combination missing here isn't sold. */
  variants: Variant[];
  status: ProductStatus;
  canOrder: boolean;
  whyNot: string | null;
  returnRule: string;
  delivery: boolean;
  pickup: boolean;
}

/** GET /v1/shop/rules: Ruxstar's limits, with the commission and platform fee. */
export interface StoreRules {
  returnDays: number;
  maxOptions: number;
  releaseHours: number;
  holdMinutes: number;
  acceptHours: number;
  maxProducts: number;
  maxVariants: number;
  maxValues: number;
  maxLines: number;
  maxQuantity: number;
  commissionBps: number;
  platformFee: number;
}

/** The console's `shopRules` on the shop module. */
export type ShopRuleSettings = Omit<StoreRules, 'commissionBps' | 'platformFee'>;

export type StoreMethod = 'delivery' | 'pickup';

export interface CartLineInput {
  productId: string;
  variantId: string;
  quantity: number;
}

export interface QuoteBody {
  lines: CartLineInput[];
  method: StoreMethod;
  address?: Partial<Pick<OrderAddress, 'line' | 'city' | 'pincode' | 'point'>>;
  code?: string;
}

export interface QuoteLine {
  productId: string;
  variantId: string;
  title: string;
  options: { name: string; value: string }[];
  unitPrice: number;
  mrp: number | null;
  quantity: number;
  total: number;
  /** Left now; under `quantity` means the line can't be bought as it is. */
  stock: number;
}

export interface StoreQuote extends CouponCheck {
  lines: QuoteLine[];
  items: number;
  delivery: number;
  deliveryKm: number | null;
  platformFee: number;
  discount: number;
  total: number;
  returnRule: string;
}

export interface PlaceStoreOrderBody {
  lines: CartLineInput[];
  method: StoreMethod;
  address?: OrderAddress;
  coupon?: string;
  note?: string;
  returnTo: string;
}

/** `paid` waits for the shop to accept. `delivered` covers picked up from the shop too. */
export type StoreOrderStatus = 'awaiting_payment' | 'paid' | 'accepted' | 'packed' | 'out_for_delivery' | 'ready_for_pickup' | 'delivered' | 'cancelled';
export type StoreActor = 'customer' | 'vendor' | 'staff' | 'system' | 'rider';
/** `wrong_item` and `damaged`: the shop pays the trip back. Otherwise one delivery fee comes off the refund. */
export type ReturnReason = 'wrong_item' | 'damaged' | 'not_as_described' | 'changed_mind' | 'other';

export interface StoreOrderLine {
  id: string;
  productId: string;
  variantId: string;
  title: string;
  /** As they were when ordered. */
  options: { name: string; value: string }[];
  photoUrl: string | null;
  sku: string | null;
  unitPrice: number;
  mrp: number | null;
  quantity: number;
  total: number;
}

export interface StoreRefund {
  kind: 'full' | 'return';
  amount: number;
  reason: string | null;
  status: 'pending' | 'done';
  at: string;
}

/** `requested` and `approved` hold the shop's money until refunded or rejected. */
export interface StoreReturn {
  reason: ReturnReason;
  note: string | null;
  lines: { lineId: string; quantity: number }[];
  status: 'requested' | 'approved' | 'rejected' | 'refunded';
  tripPaidBy: 'shop' | 'customer';
  /** Taken off the refund when the customer pays the trip back. */
  tripFee: number;
  /** What the customer gets back. */
  amount: number;
  requestedAt: string;
  decision: { by: StoreActor; note: string | null; at: string } | null;
  receivedAt: string | null;
}

interface StoreOrderBase {
  id: string;
  orderNo: number;
  status: StoreOrderStatus;
  business: { id: string; name: string };
  lines: StoreOrderLine[];
  method: StoreMethod;
  /** Null for pickup. */
  address: (Omit<OrderAddress, 'point'> & { point: GeoPoint | null }) | null;
  /** Pickup: where to collect it. */
  pickupAt: { address: string; point: GeoPoint | null; phone: string | null } | null;
  price: { items: number; delivery: number; deliveryKm: number | null; platformFee: number; discount: number; total: number };
  coupon: AppliedCoupon | null;
  note: string | null;
  timeline: { status: StoreOrderStatus; at: string; by: StoreActor }[];
  /** Unpaid: the checkout closes then. */
  payBy: string | null;
  paidAt: string | null;
  /** Paid: refunded if the shop hasn't accepted by then. */
  acceptBy: string | null;
  deliveredAt: string | null;
  returnRule: string;
  /** The last moment to ask for a return. */
  returnUntil: string | null;
  return: StoreReturn | null;
  refunds: StoreRefund[];
  refunded: number;
  cancellation: { by: StoreActor; reason: string; at: string } | null;
  invoices: InvoiceRef[];
  createdAt: string;
}

/** The customer's order. `delivery` is null while the shop delivers it itself. */
export interface StoreOrder extends StoreOrderBase {
  delivery: CustomerDelivery | null;
  /** Unpaid, or paid and not packed yet: a full refund. */
  canCancel: boolean;
  /** Delivered, the shop takes returns and the window is open. */
  canReturn: boolean;
  /** Each product, reviewed on its own once delivered. */
  reviewable: { productId: string; title: string; canReview: boolean; reviewUntil: string | null }[];
  canReview?: boolean;
  reviewUntil?: string | null;
}

export type MyStoreOrdersView = 'current' | 'past' | 'all';

/** Your share: `waiting` until the return window and the hold are over; `return` while a return is open. */
export type StorePayout = 'none' | 'waiting' | 'return' | 'released';

/** An order at the desk, for the owner and their team. */
export interface DeskStoreOrder extends StoreOrderBase {
  customer: { name: string; phone: string | null };
  delivery: ShopDelivery | null;
  commission: number;
  /** Items and delivery, less the shop's coupon, Ruxstar's commission, a partner's pay and returns. */
  vendorShare: number;
  payout: StorePayout;
  releaseAt: string | null;
  /** The steps it can move to now. */
  next: StoreOrderStatus[];
  /** Paid and not delivered; always a full refund. */
  canCancel: boolean;
}

export type DeskStoreOrdersView = 'open' | 'returns' | 'done' | 'all';
export type MoveStatus = 'accepted' | 'packed' | 'out_for_delivery' | 'ready_for_pickup' | 'delivered';

/** A shop the signed-in person owns or works at. The owner has every permission. */
export interface DeskStore {
  id: string;
  name: string;
  owner: boolean;
  permissions: string[];
  /** Orders paid and not delivered. */
  open: number;
  /** Returns open. */
  returns: number;
}

export type StoreSetupBody = Partial<StoreSetup>;

/** The owner's setup, with Ruxstar's return days for when returns are on. */
export interface StoreSetupOne extends StoreSetup {
  returnDays: number;
}

export interface VariantInput {
  values?: string[];
  price: number;
  mrp?: number | null;
  stock: number;
  sku?: string | null;
}

export interface ProductBody {
  title: string;
  description?: string | null;
  options?: ProductOption[];
  /** The variant table: one row per combination sold. Without options, one row. */
  variants: VariantInput[];
  hsn?: string | null;
  gstRateBps?: number | null;
  status?: 'live' | 'hidden';
}

/** Sending `variants` replaces the table, stock included; with `options`, send `variants` too. */
export type ProductPatch = Partial<ProductBody>;

export interface VendorProduct extends ProductDetail {
  hsn: string | null;
  gstRateBps: number | null;
  removal: { reason: string; at: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface VendorProductsQuery {
  status?: ProductStatus;
  q?: string;
  /** Only products with a variant at or under this stock. */
  lowStock?: number;
}

export interface ConsoleStore extends StoreCard {
  ownerId: string;
  status: string;
  suspended: boolean;
  /** Not removed. */
  products: number;
  /** Paid, all time. */
  orders: number;
  createdAt: string;
}

export interface ConsoleStoreOne {
  store: ConsoleStore;
  setup: StoreSetup | null;
  openOrders: number;
  openReturns: number;
}

export interface ConsoleStoresQuery {
  city?: string;
  q?: string;
}

export interface ConsoleProduct extends VendorProduct {
  vendorId: string;
}

export interface ConsoleProductsQuery {
  status?: ProductStatus;
  shop?: string;
  city?: string;
  q?: string;
}

export interface BannedCategory {
  key: string;
  name: string;
  words: string[];
  active: boolean;
  updatedAt: string;
}

export interface ConsoleStoreOrder extends DeskStoreOrder {
  customerId: string;
  vendorId: string;
  releasedAt: string | null;
}

export interface ConsoleStoreOrdersQuery {
  shop?: string;
  status?: StoreOrderStatus;
  /** `open`: requested or approved. `rejected`: the shop turned it down; Ruxstar can still approve. */
  returns?: 'open' | 'rejected';
}

/** `refund`: the items are back (or needn't be), refund now. */
export type ConsoleReturnDecision = 'approve' | 'reject' | 'refund';

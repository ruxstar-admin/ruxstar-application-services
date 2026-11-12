import type { PodProduct } from './business';

/** POST /v1/pod/files: a file the customer uploaded to print. */
export interface PrintFile {
  id: string;
  name: string;
  contentType: 'application/pdf' | 'image/jpeg' | 'image/png';
  bytes: number;
  /** PDF pages; 1 for a photo. */
  pages: number;
}

/** `placed` is paid and waiting for the shop. `rejected`, and `cancelled` after payment, are refunded in full. */
export type OrderStatus = 'awaiting_payment' | 'placed' | 'accepted' | 'printing' | 'ready' | 'out_for_delivery' | 'delivered' | 'rejected' | 'cancelled';

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
}

/** Paise. `units` is pieces, or pages times copies for documents. */
export interface OrderPrice {
  units: number;
  unitPrice: number;
  extrasPerUnit: number;
  items: number;
  platformFee: number;
  total: number;
}

export interface Quote extends OrderPrice {
  pages: number;
  minOrder: number;
  turnaroundDays: number;
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
  refund: { amount: number; status: 'pending' | 'done' } | null;
  reason: string | null;
  createdAt: string;
  updatedAt: string;
  price: OrderPrice;
}

/** The same order as the shop sees it, with Ruxstar's commission and the shop's payout. */
export interface ShopOrder extends Omit<Order, 'price'> {
  price: OrderPrice & { commissionBps: number; commission: number; payout: number };
}

export type ShopOrderView = 'new' | 'active' | 'past';
export type ShopStatus = 'accepted' | 'printing' | 'ready' | 'out_for_delivery' | 'delivered' | 'rejected';

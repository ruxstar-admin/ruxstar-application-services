import type { ModuleKey } from './vendor';

/** One purchase or booking in any module, as listed under "My orders & bookings". */
export interface Engagement {
  id: string;
  module: ModuleKey;
  title: string;
  subtitle: string;
  /** What the customer actually paid, after any coupon. */
  amount: number;
  status: 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
  createdAt: string;
  /** Opaque reference the module's detail screen understands. */
  refId: string;
}

export interface PriceLine {
  label: string;
  amount: number;
  /** Delivery fees go to the rider and are never discounted by coupons. Everything else is the item total. */
  kind?: 'item' | 'delivery';
}

export type PaymentMethod = 'upi' | 'card' | 'netbanking';

export interface PaymentSession {
  sessionId: string;
  /** Amount to pay now, after the coupon. */
  amount: number;
  discount: number;
}

export interface PaymentResult {
  status: 'paid' | 'failed';
  reference?: string;
}

/** Card for the Discover list: one offering from any module. */
export interface Listing {
  id: string;
  module: ModuleKey;
  title: string;
  subtitle: string;
  /** Short price text, e.g. "from ₹2 / page". */
  price: string;
  badge?: string;
  imageUrl?: string;
}

import type { BusinessModule } from './business';

/** `refund_pending` while money is on its way back; `part_refunded` once some came back. */
export type PaymentStatus = 'paid' | 'refund_pending' | 'part_refunded' | 'refunded';

/** GET /v1/account/payments: one per paid order, at every business. Paise. */
export interface Payment {
  id: string;
  module: BusinessModule;
  business: { id: string; name: string };
  order: { id: string; orderNo: number; label: string };
  amount: number;
  paidAt: string;
  /** The payment gateway's ID for it, once it confirmed the payment. */
  paymentId: string | null;
  status: PaymentStatus;
  refunded: number;
  /** Oldest first. */
  refunds: { amount: number; kind: 'full' | 'partial'; reason: string | null; status: 'pending' | 'done'; at: string }[];
}

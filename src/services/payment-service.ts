import { apiGetPage } from '@/lib/api-client';
import type { Payment } from '@/types/payment';

/** `/v1/account/payments`: what you paid at every business, and what came back. */
export const PaymentService = {
  list: (token: string, cursor?: string) => apiGetPage<Payment>('/v1/account/payments', token, { cursor }),
};

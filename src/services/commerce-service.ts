import { apiPost } from '@/lib/api-client';
import type { Engagement, Listing, PaymentMethod, PaymentResult, PaymentSession } from '@/types/commerce';
import type { ModuleKey } from '@/types/vendor';

export interface PaymentRequest {
  /** Everything the lines add up to, including any delivery fee. */
  amount: number;
  /** The part a coupon may discount (excludes delivery). */
  itemTotal: number;
  purpose: string;
  module?: ModuleKey;
  couponCode?: string;
}

/** Payments, Discover and the combined orders list. Not in the backend yet — mocked (commerce.mocks.ts). */
export const CommerceService = {
  startPayment: (token: string, request: PaymentRequest) => apiPost<PaymentSession>('/payments/start', { ...request }, token),
  confirmPayment: (token: string, sessionId: string, method: PaymentMethod) =>
    apiPost<PaymentResult>('/payments/confirm', { sessionId, method }, token),

  engagements: (token: string) => apiPost<Engagement[]>('/orders/list', undefined, token),
  discover: (token: string, module?: ModuleKey) => apiPost<Listing[]>('/discover/list', { module }, token),
};

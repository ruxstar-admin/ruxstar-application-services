import { apiGetPage, apiPatch, apiPost, newIdempotencyKey } from '@/lib/api-client';
import type { CouponPatch, ManagedCoupon, NewCoupon } from '@/types/coupon';

/** `/v1/vendor/coupons`: a vendor's own coupons for their print shops. The discount comes out of their share. */
export const CouponService = {
  list: (token: string, cursor?: string) => apiGetPage<ManagedCoupon>('/v1/vendor/coupons', token, { cursor }),
  create: (token: string, body: NewCoupon, idempotencyKey = newIdempotencyKey()) =>
    apiPost<ManagedCoupon>('/v1/vendor/coupons', { ...body }, token, { idempotencyKey }),
  update: (token: string, id: string, patch: CouponPatch) => apiPatch<ManagedCoupon>(`/v1/vendor/coupons/${encodeURIComponent(id)}`, { ...patch }, token),
};

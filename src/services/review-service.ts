import { apiDelete, apiGet, apiGetPage, apiPost, apiPut, type WriteOptions } from '@/lib/api-client';
import type { MyReview, Review, ReviewCase, ReviewReportReason, ShopReview } from '@/types/review';

const id = (value: string) => encodeURIComponent(value);
type Done = { done: true };

/** `/v1/pod`: customers review their delivered orders and read a shop's reviews. */
export const ReviewService = {
  /** Null until the customer reviews the order. */
  mine: (token: string, orderId: string) => apiGet<MyReview | null>(`/v1/pod/orders/${id(orderId)}/review`, token),
  /** For 30 days after delivery. Leaving out `text` keeps it; null clears it. */
  write: (token: string, orderId: string, body: { rating: number; text?: string | null }) =>
    apiPut<MyReview>(`/v1/pod/orders/${id(orderId)}/review`, token, { ...body }),
  remove: (token: string, orderId: string) => apiDelete<Done>(`/v1/pod/orders/${id(orderId)}/review`, token),
  forShop: (token: string, shopId: string, cursor?: string) => apiGetPage<Review>(`/v1/pod/shops/${id(shopId)}/reviews`, token, { cursor }),
  /** One open report per review; the writer isn't told. */
  report: (token: string, reviewId: string, body: { reason: ReviewReportReason; note?: string }) =>
    apiPost<Done>(`/v1/pod/reviews/${id(reviewId)}/report`, { ...body }, token),
};

/** `/v1/vendor/businesses/{id}/reviews`: a vendor's shop reviews and its replies. */
export const ShopReviewService = {
  list: (token: string, businessId: string, cursor?: string) =>
    apiGetPage<ShopReview>(`/v1/vendor/businesses/${id(businessId)}/reviews`, token, { cursor }),
  /** The customer is told the first time. */
  reply: (token: string, businessId: string, reviewId: string, text: string) =>
    apiPut<ShopReview>(`/v1/vendor/businesses/${id(businessId)}/reviews/${id(reviewId)}/reply`, token, { text }),
  removeReply: (token: string, businessId: string, reviewId: string) =>
    apiDelete<ShopReview>(`/v1/vendor/businesses/${id(businessId)}/reviews/${id(reviewId)}/reply`, token),
};

/** `/v1/employment/{placeId}/reviews`: the same for people on the team with `reviews.reply`. */
export const TeamReviewService = {
  list: (token: string, placeId: string, cursor?: string) => apiGetPage<ShopReview>(`/v1/employment/${id(placeId)}/reviews`, token, { cursor }),
  reply: (token: string, placeId: string, reviewId: string, text: string) =>
    apiPut<ShopReview>(`/v1/employment/${id(placeId)}/reviews/${id(reviewId)}/reply`, token, { text }),
  removeReply: (token: string, placeId: string, reviewId: string) =>
    apiDelete<ShopReview>(`/v1/employment/${id(placeId)}/reviews/${id(reviewId)}/reply`, token),
};

/** `/v1/ruxstar/reports/reviews`: the console's reported reviews. */
export const ReviewReportService = {
  list: (token: string, status: 'open' | 'closed', cursor?: string) => apiGetPage<ReviewCase>('/v1/ruxstar/reports/reviews', token, { status, cursor }),
  keep: (token: string, reviewId: string, options: WriteOptions) =>
    apiPost<ReviewCase>(`/v1/ruxstar/reports/reviews/${id(reviewId)}/keep`, undefined, token, options),
  /** The customer is told the reason. */
  remove: (token: string, reviewId: string, reason: string, options: WriteOptions) =>
    apiPost<ReviewCase>(`/v1/ruxstar/reports/reviews/${id(reviewId)}/remove`, { reason }, token, options),
};

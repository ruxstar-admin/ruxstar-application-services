/** A shop's live reviews. `average` is to one decimal, and null until there are 3 reviews. */
export interface Rating {
  average: number | null;
  count: number;
}

export interface ReviewAuthor {
  id: string;
  name: string;
  username: string | null;
  avatarUrl: string | null;
}

/** GET /v1/pod/shops/{id}/reviews: a review as anyone sees it on the shop's page. */
export interface Review {
  id: string;
  /** 1 to 5 stars. */
  rating: number;
  text: string | null;
  /** What was ordered, for example "T-Shirts". */
  product: string;
  author: ReviewAuthor | null;
  /** The shop's answer. */
  reply: { text: string; at: string; editedAt: string | null } | null;
  createdAt: string;
  editedAt: string | null;
}

/** GET /v1/pod/orders/{id}/review: the customer's own review. A removed one keeps Ruxstar's reason and can't change. */
export interface MyReview extends Review {
  orderId: string;
  status: 'live' | 'removed';
  removedReason: string | null;
}

/** A review as the shop sees it, with the order it was about. */
export interface ShopReview extends Review {
  orderId: string;
  orderNo: number;
}

export type ReviewReportReason = 'spam' | 'fake' | 'abuse' | 'other';

/** The console's reported reviews, one row per review. `review` is null once the customer deleted it. */
export interface ReviewCase {
  reviewId: string;
  review:
    | (Review & {
        status: 'live' | 'removed';
        shop: { id: string; name: string };
        orderNo: number;
        removal: { reason: string; at: string } | null;
      })
    | null;
  status: 'open' | 'closed';
  reports: number;
  reasons: Record<ReviewReportReason, number>;
  notes: string[];
  firstAt: string;
  lastAt: string;
  outcome: 'kept' | 'removed' | null;
  closedAt: string | null;
}

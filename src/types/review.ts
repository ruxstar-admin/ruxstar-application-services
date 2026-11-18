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

/** The kind of business a review is about. Missing on old print reviews. */
export type ReviewModule = 'pod' | 'events' | 'coaching' | 'turf' | 'stays' | 'shop' | 'gigs';

/** The event, course, ground, property or local shop product reviewed; null for print. */
export interface ReviewListing {
  type: 'event' | 'course' | 'ground' | 'property' | 'product' | 'gig';
  id: string;
}

/** A review as anyone sees it on the business's page, or on an event's, course's or ground's. */
export interface Review {
  id: string;
  /** 1 to 5 stars. */
  rating: number;
  text: string | null;
  /** What was bought: a print product such as "T-Shirts", or an event's, course's or ground's name. */
  product: string;
  author: ReviewAuthor | null;
  /** The business's answer. */
  reply: { text: string; at: string; editedAt: string | null } | null;
  createdAt: string;
  editedAt: string | null;
  module?: ReviewModule;
  listing?: ReviewListing | null;
}

/** GET /v1/{module}/orders/{id}/review: the customer's own review. A removed one keeps Ruxstar's reason and can't change. */
export interface MyReview extends Review {
  orderId: string;
  status: 'live' | 'removed';
  removedReason: string | null;
}

/** A review as the business sees it, with the order, booking or enrolment it was about. */
export interface ShopReview extends Review {
  orderId: string;
  orderNo: number;
}

export type ReviewReportReason = 'spam' | 'fake' | 'abuse' | 'other';

/** The console's reported reviews of every kind of business, one row per review. `review` is null once the customer deleted it. */
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

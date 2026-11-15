import type { Href } from 'expo-router';
import type { Rating, ReviewListing, ReviewModule, ReviewReportReason, ShopReview } from '@/types/review';

export const REVIEW_TEXT_MAX = 500;
export const REPLY_TEXT_MAX = 500;

export const starsLabel = (n: number) => `${n} star${n === 1 ? '' : 's'}`;

/** "4.3 (12)", or "New" before a shop has 3 reviews. */
export const ratingShort = (rating: Rating) => (rating.average === null ? 'New' : `${rating.average.toFixed(1)} (${rating.count})`);

/** "4.3 from 12 reviews", or what a newer shop has so far. */
export function ratingLine(rating: Rating): string {
  if (rating.average !== null) return `${rating.average.toFixed(1)} from ${rating.count} reviews`;
  if (rating.count === 0) return 'New: no reviews yet';
  return `New: ${rating.count} review${rating.count === 1 ? '' : 's'} so far`;
}

export const REPORT_REASONS: { key: ReviewReportReason; label: string }[] = [
  { key: 'spam', label: 'Spam or ads' },
  { key: 'fake', label: 'Not a real customer' },
  { key: 'abuse', label: 'Abusive' },
  { key: 'other', label: 'Something else' },
];

/** Shown under the star picker for the stars chosen. */
export const STAR_WORDS: Record<number, string> = { 1: 'Poor', 2: 'Not great', 3: 'Okay', 4: 'Good', 5: 'Excellent' };

/** Who answers reviews at each kind of business. Old print reviews have no `module`. */
const OWNER: Record<ReviewModule, string> = { pod: 'shop', events: 'organiser', coaching: 'institute', turf: 'ground', stays: 'owner', shop: 'shop' };
export const replyFrom = (module: ReviewModule = 'pod') => `From the ${OWNER[module]}`;

const ORDER_WORD: Record<ReviewModule, string> = { pod: 'Order', events: 'Booking', coaching: 'Enrolment', turf: 'Booking', stays: 'Reservation', shop: 'Order' };
export const orderWord = (module: ReviewModule = 'pod') => ORDER_WORD[module];
/** "Booking #12", "Enrolment #12", "Order #12". */
export const orderLabel = (review: Pick<ShopReview, 'module' | 'orderNo'>) => `${orderWord(review.module)} #${review.orderNo}`;

const LISTING: Record<ReviewListing['type'], { one: string; many: string }> = {
  event: { one: 'Event', many: 'events' },
  course: { one: 'Course', many: 'courses' },
  ground: { one: 'Ground', many: 'grounds' },
  property: { one: 'Property', many: 'properties' },
  product: { one: 'Product', many: 'products' },
};
export const listingWord = (type: ReviewListing['type']) => LISTING[type].one;
/** Under a listing's rating, which covers the whole business: "Across Asha Events’s events". */
export const acrossLine = (business: string, type: ReviewListing['type']) => `Across ${business}’s ${LISTING[type].many}`;

/**
 * Where a business's review leads: the print order, the event's bookings, the course's students, the ground booking or the stay.
 * People on the team (`team`) open print orders from Work and ground bookings and stays from the desk; event and course lists are the owner's.
 */
export function reviewLink(review: Pick<ShopReview, 'module' | 'listing' | 'orderId'>, team: boolean): { label: string; href: Href } | null {
  switch (review.module ?? 'pod') {
    case 'pod':
      return {
        label: 'Open order',
        href: team ? { pathname: '/(customer)/work/order/[id]', params: { id: review.orderId } } : { pathname: '/(vendor)/sale/[id]', params: { id: review.orderId } },
      };
    case 'events':
      return !team && review.listing ? { label: 'See bookings', href: { pathname: '/(vendor)/events/[id]/bookings', params: { id: review.listing.id } } } : null;
    case 'coaching':
      return !team && review.listing ? { label: 'See students', href: { pathname: '/(vendor)/courses/[id]/students', params: { id: review.listing.id } } } : null;
    case 'turf':
      return { label: 'Open booking', href: { pathname: '/(customer)/ground-desk/booking/[id]', params: { id: review.orderId } } };
    case 'stays':
      return { label: 'Open reservation', href: { pathname: '/(customer)/stays-desk/order/[id]', params: { id: review.orderId } } };
    case 'shop':
      return { label: 'Open order', href: { pathname: '/(customer)/store-desk/order/[id]', params: { id: review.orderId } } };
    default:
      return null;
  }
}

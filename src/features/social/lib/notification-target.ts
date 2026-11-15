import type { Href } from 'expo-router';
import type { AppNotification } from '@/types/social';

type Target = Pick<
  AppNotification,
  | 'postId'
  | 'businessId'
  | 'orderId'
  | 'shopOrderId'
  | 'profileId'
  | 'verification'
  | 'deliveryVerification'
  | 'payments'
  | 'workId'
  | 'teamBusinessId'
  | 'workOrderId'
  | 'reviewsBusinessId'
  | 'workReviewsId'
  | 'supportTicketId'
  | 'eventId'
  | 'eventOrderId'
  | 'vendorEventId'
  | 'courseId'
  | 'coachingOrderId'
  | 'vendorCourseId'
  | 'batchId'
>;

/** The screen a notification opens, from the notifications screen or a phone notification; undefined when it opens none. */
export function notificationHref(n: Target): Href | undefined {
  if (n.postId) return { pathname: '/(customer)/post/[id]', params: { id: n.postId } };
  if (n.businessId) return { pathname: '/(vendor)/businesses/[id]', params: { id: n.businessId } };
  if (n.orderId) return { pathname: '/(customer)/pod/order/[id]', params: { id: n.orderId } };
  if (n.shopOrderId) return { pathname: '/(vendor)/sale/[id]', params: { id: n.shopOrderId } };
  if (n.profileId) return { pathname: '/(customer)/user/[id]', params: { id: n.profileId } };
  if (n.verification) return '/(customer)/settings/verification';
  if (n.deliveryVerification) return '/(customer)/settings/delivery';
  if (n.payments) return '/(vendor)/(tabs)/payments';
  if (n.workId) return { pathname: '/(customer)/work/[id]', params: { id: n.workId } };
  if (n.teamBusinessId) return { pathname: '/(vendor)/businesses/[id]/team', params: { id: n.teamBusinessId } };
  if (n.workOrderId) return { pathname: '/(customer)/work/order/[id]', params: { id: n.workOrderId } };
  if (n.reviewsBusinessId) return { pathname: '/(vendor)/businesses/[id]/reviews', params: { id: n.reviewsBusinessId } };
  if (n.workReviewsId) return { pathname: '/(customer)/work/reviews/[id]', params: { id: n.workReviewsId } };
  if (n.supportTicketId) return { pathname: '/(customer)/support/[id]', params: { id: n.supportTicketId } };
  if (n.eventId) return { pathname: '/(customer)/events/[id]', params: { id: n.eventId } };
  if (n.eventOrderId) return { pathname: '/(customer)/events/ticket/[id]', params: { id: n.eventOrderId } };
  if (n.vendorEventId) return { pathname: '/(vendor)/events/[id]', params: { id: n.vendorEventId } };
  if (n.courseId) return { pathname: '/(customer)/coaching/[id]', params: { id: n.courseId } };
  if (n.coachingOrderId) return { pathname: '/(customer)/coaching/enrolment/[id]', params: { id: n.coachingOrderId } };
  if (n.vendorCourseId) return { pathname: '/(vendor)/courses/[id]', params: { id: n.vendorCourseId } };
  if (n.batchId) return { pathname: '/(customer)/teach/batch/[id]', params: { id: n.batchId } };
  return undefined;
}

const LINKS = {
  post: (id) => ({ postId: id }),
  business: (id) => ({ businessId: id }),
  verification: (id) => (id === 'delivery' ? { deliveryVerification: true } : { verification: true }),
  order: (id) => ({ orderId: id }),
  shop_order: (id) => ({ shopOrderId: id }),
  profile: (id) => ({ profileId: id }),
  payments: () => ({ payments: true }),
  work: (id) => ({ workId: id }),
  team: (id) => ({ teamBusinessId: id }),
  work_order: (id) => ({ workOrderId: id }),
  reviews: (id) => ({ reviewsBusinessId: id }),
  work_reviews: (id) => ({ workReviewsId: id }),
  delivery_job: () => ({ deliveryVerification: true }),
  delivery_earnings: () => ({ deliveryVerification: true }),
  support: (id) => ({ supportTicketId: id }),
  event: (id) => ({ eventId: id }),
  event_order: (id) => ({ eventOrderId: id }),
  vendor_event: (id) => ({ vendorEventId: id }),
  coaching_course: (id) => ({ courseId: id }),
  coaching_order: (id) => ({ coachingOrderId: id }),
  vendor_course: (id) => ({ vendorCourseId: id }),
  coaching_batch: (id) => ({ batchId: id }),
} satisfies Record<string, (id: string) => Target>;

/** The API's `link.screen` values. */
export type NotificationScreen = keyof typeof LINKS;

/** What a notification's `screen` and `id` point at, in the notifications screen's terms. Unknown screens point nowhere. */
export const notificationLink = (screen: string, id: string): Target => (Object.hasOwn(LINKS, screen) ? LINKS[screen as NotificationScreen](id) : {});

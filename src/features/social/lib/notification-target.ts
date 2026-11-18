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
  | 'groundId'
  | 'turfOrderId'
  | 'deskGroundId'
  | 'stayPropertyId'
  | 'stayOrderId'
  | 'deskPropertyId'
  | 'storeId'
  | 'storeProductId'
  | 'storeOrderId'
  | 'deskStoreOrderId'
  | 'gigId'
  | 'gigOrderId'
  | 'deskGigOrderId'
  | 'freelance'
  | 'freelancePayments'
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
  if (n.groundId) return { pathname: '/(customer)/turf/[id]', params: { id: n.groundId } };
  if (n.turfOrderId) return { pathname: '/(customer)/turf/booking/[id]', params: { id: n.turfOrderId } };
  if (n.deskGroundId) return { pathname: '/(customer)/ground-desk/[id]', params: { id: n.deskGroundId } };
  if (n.stayPropertyId) return { pathname: '/(customer)/stays/[id]', params: { id: n.stayPropertyId } };
  if (n.stayOrderId) return { pathname: '/(customer)/stays/order/[id]', params: { id: n.stayOrderId } };
  if (n.deskPropertyId) return { pathname: '/(customer)/stays-desk/[id]', params: { id: n.deskPropertyId } };
  if (n.storeId) return { pathname: '/(customer)/store/[id]', params: { id: n.storeId } };
  if (n.storeProductId) return { pathname: '/(customer)/store/product/[id]', params: { id: n.storeProductId } };
  if (n.storeOrderId) return { pathname: '/(customer)/store/order/[id]', params: { id: n.storeOrderId } };
  if (n.deskStoreOrderId) return { pathname: '/(customer)/store-desk/order/[id]', params: { id: n.deskStoreOrderId } };
  if (n.gigId) return { pathname: '/(customer)/gigs/[id]', params: { id: n.gigId } };
  if (n.gigOrderId) return { pathname: '/(customer)/gigs/order/[id]', params: { id: n.gigOrderId } };
  if (n.deskGigOrderId) return { pathname: '/(customer)/freelance/orders/[id]', params: { id: n.deskGigOrderId } };
  if (n.freelance) return '/(customer)/freelance';
  if (n.freelancePayments) return '/(customer)/freelance/payments';
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
  turf_ground: (id) => ({ groundId: id }),
  turf_order: (id) => ({ turfOrderId: id }),
  vendor_ground: (id) => ({ deskGroundId: id }),
  stay_property: (id) => ({ stayPropertyId: id }),
  stay_order: (id) => ({ stayOrderId: id }),
  vendor_property: (id) => ({ deskPropertyId: id }),
  store: (id) => ({ storeId: id }),
  store_product: (id) => ({ storeProductId: id }),
  store_order: (id) => ({ storeOrderId: id }),
  vendor_store_order: (id) => ({ deskStoreOrderId: id }),
  gig: (id) => ({ gigId: id }),
  gig_order: (id) => ({ gigOrderId: id }),
  vendor_gig_order: (id) => ({ deskGigOrderId: id }),
  freelance: () => ({ freelance: true }),
  freelance_payments: () => ({ freelancePayments: true }),
} satisfies Record<string, (id: string) => Target>;

/** The API's `link.screen` values. */
export type NotificationScreen = keyof typeof LINKS;

/** What a notification's `screen` and `id` point at, in the notifications screen's terms. Unknown screens point nowhere. */
export const notificationLink = (screen: string, id: string): Target => (Object.hasOwn(LINKS, screen) ? LINKS[screen as NotificationScreen](id) : {});

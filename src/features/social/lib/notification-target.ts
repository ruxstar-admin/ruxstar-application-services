import type { Href } from 'expo-router';
import type { AppNotification } from '@/types/social';

type Target = Pick<AppNotification, 'postId' | 'businessId' | 'orderId' | 'shopOrderId' | 'profileId' | 'verification' | 'payments'>;

/** The screen a notification opens, from the notifications screen or a phone notification; undefined when it opens none. */
export function notificationHref(n: Target): Href | undefined {
  if (n.postId) return { pathname: '/(customer)/post/[id]', params: { id: n.postId } };
  if (n.businessId) return { pathname: '/(vendor)/businesses/[id]', params: { id: n.businessId } };
  if (n.orderId) return { pathname: '/(customer)/pod/order/[id]', params: { id: n.orderId } };
  if (n.shopOrderId) return { pathname: '/(vendor)/sale/[id]', params: { id: n.shopOrderId } };
  if (n.profileId) return { pathname: '/(customer)/user/[id]', params: { id: n.profileId } };
  if (n.verification) return '/(customer)/settings/verification';
  if (n.payments) return '/(vendor)/(tabs)/payments';
  return undefined;
}

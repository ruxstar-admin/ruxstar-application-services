import { Stack } from 'expo-router';
import { STACK_SCREEN_OPTIONS } from '@/constants/motion';

/**
 * Delivery partner area. Delivery is a separate app (scope review #3); this group is the self-contained
 * host for `features/delivery` until that app exists, and opens only for accounts with the delivery role.
 */
export default function PartnerLayout() {
  return <Stack screenOptions={STACK_SCREEN_OPTIONS} />;
}

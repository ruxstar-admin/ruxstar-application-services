import { Stack } from 'expo-router';
import { STACK_SCREEN_OPTIONS } from '@/constants/motion';

/** A business opened from a link still has the portal tabs behind it for Back. */
export const unstable_settings = { initialRouteName: '(tabs)' };

export default function VendorLayout() {
  return <Stack screenOptions={STACK_SCREEN_OPTIONS} />;
}

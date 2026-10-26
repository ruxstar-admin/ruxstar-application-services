import { Stack } from 'expo-router';
import { STACK_SCREEN_OPTIONS } from '@/constants/motion';

/** Customer area: the tab shell plus screens pushed on top of it (settings, edit profile, other users). */
export default function CustomerLayout() {
  return <Stack screenOptions={STACK_SCREEN_OPTIONS} />;
}

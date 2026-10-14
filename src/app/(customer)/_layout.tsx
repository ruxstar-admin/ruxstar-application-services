import { Stack } from 'expo-router';
import { STACK_SCREEN_OPTIONS } from '@/constants/motion';

export default function CustomerLayout() {
  return <Stack screenOptions={STACK_SCREEN_OPTIONS} />;
}

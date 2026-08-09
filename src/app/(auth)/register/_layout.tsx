/**
 * Register sub-stack layout
 */
import { Stack } from 'expo-router';

export default function RegisterLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'fade',
        contentStyle: { backgroundColor: 'transparent' },
      }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="details" />
      <Stack.Screen name="vendor-details" />
    </Stack>
  );
}

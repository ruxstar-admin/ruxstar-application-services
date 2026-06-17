import { Stack } from 'expo-router';
import { Brand } from '@/constants/theme';

export default function KycLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Brand.bg },
        animation: 'slide_from_right',
      }}
    />
  );
}

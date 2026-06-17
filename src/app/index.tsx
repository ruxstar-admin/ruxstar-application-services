/**
 * Root index — neutral loading screen while AuthGuard (in _layout.tsx)
 * waits for Zustand hydration then routes to the correct place.
 * DO NOT put a <Redirect> here — it fires before AsyncStorage is ready.
 */
import { View, ActivityIndicator } from 'react-native';
import { Brand } from '@/constants/theme';

export default function Index() {
  return (
    <View style={{ flex: 1, backgroundColor: Brand.bg, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator color={Brand.primary} size="large" />
    </View>
  );
}

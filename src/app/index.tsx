/**
 * Root index — neutral screen while AuthGuard (in _layout.tsx)
 * waits for Zustand hydration then routes to the correct place.
 * The splash overlay in _layout.tsx covers this during hydration.
 */
import { View } from 'react-native';

export default function Index() {
  return <View style={{ flex: 1, backgroundColor: '#0A0314' }} />;
}

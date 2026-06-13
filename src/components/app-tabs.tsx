/**
 * AppTabs — native tab bar component (SDK 52 / expo-router 4.x compatible)
 *
 * NativeTabs from expo-router/unstable-native-tabs was removed.
 * Standard expo-router <Tabs> is used instead.
 * The actual tab layouts are defined per-group in (user)/_layout.tsx and (vendor)/_layout.tsx.
 */
import { Tabs } from 'expo-router';

export default function AppTabs() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
      }}>
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="explore" options={{ title: 'Explore' }} />
    </Tabs>
  );
}

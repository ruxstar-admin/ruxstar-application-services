import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { TAB_SCREEN_OPTIONS } from '@/constants/motion';
import { Feedback } from '@/lib/haptics';

export default function PartnerTabs() {
  return (
    <Tabs screenOptions={TAB_SCREEN_OPTIONS} screenListeners={{ tabPress: Feedback.select }}>
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={color} /> }} />
      <Tabs.Screen name="jobs" options={{ title: 'Jobs', tabBarIcon: ({ color, size }) => <Ionicons name="bicycle-outline" size={size} color={color} /> }} />
      <Tabs.Screen name="earnings" options={{ title: 'Earnings', tabBarIcon: ({ color, size }) => <Ionicons name="wallet-outline" size={size} color={color} /> }} />
    </Tabs>
  );
}

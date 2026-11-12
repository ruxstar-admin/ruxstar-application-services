import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { TAB_SCREEN_OPTIONS } from '@/constants/motion';
import { useCan } from '@/features/admin/access';
import { Feedback } from '@/lib/haptics';

export default function AdminTabs() {
  const kyc = useCan('kyc.view');
  const reports = useCan('reports.view');
  const people = useCan('users.view');

  return (
    <Tabs backBehavior="history" screenOptions={TAB_SCREEN_OPTIONS} screenListeners={{ tabPress: Feedback.select }}>
      <Tabs.Screen name="index" options={{ title: 'Dashboard', tabBarIcon: ({ color, size }) => <Ionicons name="grid-outline" size={size} color={color} /> }} />
      <Tabs.Screen
        name="kyc"
        options={{ title: 'Verification', href: kyc ? undefined : null, tabBarIcon: ({ color, size }) => <Ionicons name="shield-checkmark-outline" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="reports"
        options={{ title: 'Reports', href: reports ? undefined : null, tabBarIcon: ({ color, size }) => <Ionicons name="flag-outline" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="people"
        options={{ title: 'People', href: people ? undefined : null, tabBarIcon: ({ color, size }) => <Ionicons name="people-outline" size={size} color={color} /> }}
      />
      <Tabs.Screen name="more" options={{ title: 'More', tabBarIcon: ({ color, size }) => <Ionicons name="menu-outline" size={size} color={color} /> }} />
    </Tabs>
  );
}

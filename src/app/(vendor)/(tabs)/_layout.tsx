import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { TAB_SCREEN_OPTIONS } from '@/constants/motion';
import { Feedback } from '@/lib/haptics';

type IconName = keyof typeof Ionicons.glyphMap;

// File names differ from other groups' routes (`/businesses` is the console's, `/orders` the customer's) so URLs never clash.
const TABS: readonly { name: string; title: string; icon: IconName; iconActive: IconName }[] = [
  { name: 'dashboard', title: 'Dashboard', icon: 'grid-outline', iconActive: 'grid' },
  { name: 'shops', title: 'Businesses', icon: 'storefront-outline', iconActive: 'storefront' },
  { name: 'sales', title: 'Orders', icon: 'receipt-outline', iconActive: 'receipt' },
  { name: 'posts', title: 'Posts', icon: 'megaphone-outline', iconActive: 'megaphone' },
  { name: 'payments', title: 'Payments', icon: 'wallet-outline', iconActive: 'wallet' },
];

export default function VendorTabs() {
  return (
    <Tabs backBehavior="history" screenOptions={TAB_SCREEN_OPTIONS} screenListeners={{ tabPress: Feedback.select }}>
      {TABS.map(({ name, title, icon, iconActive }) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            title,
            tabBarIcon: ({ color, size, focused }) => <Ionicons name={focused ? iconActive : icon} size={size} color={color} />,
          }}
        />
      ))}
    </Tabs>
  );
}

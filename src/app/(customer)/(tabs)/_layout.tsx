import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { TAB_SCREEN_OPTIONS } from '@/constants/motion';
import { Brand } from '@/constants/theme';
import { useMessagesUnread } from '@/features/chat/hooks/use-messages-unread';
import { Feedback } from '@/lib/haptics';

type IconName = keyof typeof Ionicons.glyphMap;

const TABS: readonly { name: string; title: string; icon: IconName; iconActive: IconName }[] = [
  { name: 'index', title: 'Feed', icon: 'home-outline', iconActive: 'home' },
  { name: 'discover', title: 'Discover', icon: 'compass-outline', iconActive: 'compass' },
  { name: 'search', title: 'Search', icon: 'search-outline', iconActive: 'search' },
  { name: 'messages', title: 'Messages', icon: 'chatbubble-outline', iconActive: 'chatbubble' },
  { name: 'profile', title: 'Profile', icon: 'person-outline', iconActive: 'person' },
];

export default function CustomerTabs() {
  const { unread, requests } = useMessagesUnread();
  const waiting = unread + requests;

  return (
    <Tabs backBehavior="history" screenOptions={TAB_SCREEN_OPTIONS} screenListeners={{ tabPress: Feedback.select }}>
      {TABS.map(({ name, title, icon, iconActive }) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            title,
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons name={focused ? iconActive : icon} size={size} color={color} />
            ),
            ...(name === 'messages' && waiting > 0
              ? { tabBarBadge: waiting > 99 ? '99+' : waiting, tabBarBadgeStyle: { backgroundColor: Brand.primary, color: Brand.text } }
              : {}),
          }}
        />
      ))}
    </Tabs>
  );
}

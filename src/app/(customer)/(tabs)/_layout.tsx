import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { TAB_SCREEN_OPTIONS } from '@/constants/motion';
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
  const unreadMessages = useMessagesUnread();

  return (
    <Tabs screenOptions={TAB_SCREEN_OPTIONS} screenListeners={{ tabPress: Feedback.select }}>
      {TABS.map(({ name, title, icon, iconActive }) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            title,
            tabBarBadge: name === 'messages' && unreadMessages > 0 ? unreadMessages : undefined,
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons name={focused ? iconActive : icon} size={size} color={color} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}

/**
 * User App Layout — tab navigator for authenticated users
 */

import { Tabs } from 'expo-router';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Brand, Colors, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

function TabIcon({ icon, label, focused }: { icon: string; label: string; focused: boolean }) {
  return (
    <View style={[tabStyles.iconContainer, focused && tabStyles.iconContainerFocused]}>
      <Text style={tabStyles.emoji}>{icon}</Text>
      <Text style={[tabStyles.label, focused && tabStyles.labelFocused]}>{label}</Text>
    </View>
  );
}

const tabStyles = StyleSheet.create({
  iconContainer: {
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: Spacing.two,
    paddingVertical: 4,
    borderRadius: 10,
    minWidth: 56,
  },
  iconContainerFocused: {
    backgroundColor: 'rgba(32,138,239,0.12)',
  },
  emoji: { fontSize: 22 },
  label: {
    fontSize: 10,
    color: 'rgba(0,0,0,0.35)',
    fontWeight: '500',
  },
  labelFocused: {
    color: Brand.primary,
    fontWeight: '700',
  },
});

export default function UserLayout() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' ? 'dark' : scheme];

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: Brand.surfaceCardBorder,
          height: Platform.select({ ios: 82, android: 65, default: 60 }),
          paddingBottom: Platform.select({ ios: 26, android: 10, default: 8 }),
          paddingTop: 8,
        },
        tabBarActiveTintColor: Brand.primary,
        tabBarInactiveTintColor: 'rgba(0,0,0,0.35)',
        tabBarShowLabel: false,
      }}>

      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="🏠" label="Home" focused={focused} />
          ),
        }}
      />

      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="🔍" label="Explore" focused={focused} />
          ),
        }}
      />

      <Tabs.Screen
        name="orders"
        options={{
          title: 'Orders',
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="🛒" label="Orders" focused={focused} />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="👤" label="Profile" focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}

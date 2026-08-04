/**
 * User Tab Layout — Ionicons tab icons, active indicator above icon
 */

import { Tabs } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/useTheme';

// ─── Tab Icon ─────────────────────────────────────────────────────────────────

type TabIconProps = {
  label:       string;
  focused:     boolean;
  icon:        keyof typeof Ionicons.glyphMap;
  iconFocused: keyof typeof Ionicons.glyphMap;
};

function TabIcon({ label, focused, icon, iconFocused }: TabIconProps) {
  const { brand } = useTheme();
  return (
    <View style={tab.wrap}>
      <View style={[tab.indicator, focused && { backgroundColor: brand.primary }]} />
      <Ionicons
        name={focused ? iconFocused : icon}
        size={22}
        color={focused ? brand.primary : brand.creamMuted}
      />
      <Text
        style={[tab.label, { color: focused ? brand.primary : brand.creamMuted }, focused && tab.labelActive]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
}

const tab = StyleSheet.create({
  wrap: {
    width: 72,
    alignItems: 'center',
    gap: 3,
    paddingTop: 6,
  },
  indicator: {
    position: 'absolute',
    top: 0,
    width: 20,
    height: 2,
    borderRadius: 2,
    backgroundColor: 'transparent',
  },
  label: {
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 0.1,
  },
  labelActive: {
    fontWeight: '700',
  },
});

// ─── Layout ───────────────────────────────────────────────────────────────────

export default function UserLayout() {
  const insets = useSafeAreaInsets();
  const { brand } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown:             false,
        tabBarShowLabel:         false,
        tabBarActiveTintColor:   brand.primary,
        tabBarInactiveTintColor: brand.creamMuted,
        tabBarStyle: {
          backgroundColor: brand.bg,
          borderTopWidth:  1,
          borderTopColor:  brand.border1,
          elevation:       0,
          shadowOpacity:   0,
          paddingBottom:   insets.bottom,
          height:          56 + insets.bottom,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Discover',
          tabBarIcon: ({ focused }) => (
            <TabIcon label="Discover" focused={focused} icon="compass-outline" iconFocused="compass" />
          ),
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: 'Bookings',
          tabBarIcon: ({ focused }) => (
            <TabIcon label="Bookings" focused={focused} icon="calendar-outline" iconFocused="calendar" />
          ),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Notifications',
          tabBarIcon: ({ focused }) => (
            <TabIcon label="Alerts" focused={focused} icon="notifications-outline" iconFocused="notifications" />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused }) => (
            <TabIcon label="Profile" focused={focused} icon="person-outline" iconFocused="person" />
          ),
        }}
      />

      {/* Hidden — no tab bar */}
      <Tabs.Screen
        name="commerce"
        options={{ href: null, tabBarStyle: { display: 'none' } }}
      />
      <Tabs.Screen
        name="commerce-order-detail"
        options={{ href: null, tabBarStyle: { display: 'none' } }}
      />
      <Tabs.Screen
        name="event-detail"
        options={{ href: null, tabBarStyle: { display: 'none' } }}
      />
      <Tabs.Screen
        name="book"
        options={{ href: null, tabBarStyle: { display: 'none' } }}
      />
      <Tabs.Screen
        name="venue-detail"
        options={{ href: null, tabBarStyle: { display: 'none' } }}
      />
      <Tabs.Screen
        name="listing"
        options={{ href: null, tabBarStyle: { display: 'none' } }}
      />
      <Tabs.Screen
        name="payment-status"
        options={{ href: null, tabBarStyle: { display: 'none' } }}
      />
      <Tabs.Screen
        name="print"
        options={{ href: null, tabBarStyle: { display: 'none' } }}
      />
      <Tabs.Screen
        name="print-order"
        options={{ href: null, tabBarStyle: { display: 'none' } }}
      />
    </Tabs>
  );
}

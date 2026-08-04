/**
 * Vendor Tab Layout
 * • Ionicons tab icons — no custom SVG, no emojis
 * • Slim active indicator above icon
 * • Tab bar hidden inside kyc/* stack
 * • KycGuard only redirects for pending_review / rejected (not pending/in_progress)
 */

import { useEffect } from 'react';
import { Tabs, router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '@/stores/auth-store';
import { useKycStore, nextKycStep } from '@/stores/kyc-store';
import { useTheme } from '@/hooks/useTheme';

// ─── Tab Icon ─────────────────────────────────────────────────────────────────

type TabIconProps = {
  label:        string;
  focused:      boolean;
  icon:         keyof typeof Ionicons.glyphMap;
  iconFocused:  keyof typeof Ionicons.glyphMap;
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
    width: 62,
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

// ─── KYC Guard ────────────────────────────────────────────────────────────────

function KycGuard() {
  const token       = useAuthStore((s) => s.token);
  const kycStatus   = useKycStore((s) => s.status);
  const fetchStatus = useKycStore((s) => s.fetchStatus);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const status = kycStatus ?? await fetchStatus(token);
        const step   = nextKycStep(status);
        if (step === 'pending_review') router.replace('/(vendor)/kyc/pending-review');
        if (step === 'rejected')       router.replace('/(vendor)/kyc/rejected');
      } catch {
        // Network error — let user through
      }
    })();
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}

// ─── Tab bar styles ───────────────────────────────────────────────────────────

const TAB_BAR_HIDDEN = {
  tabBarStyle: { display: 'none' as const },
} as const;

// ─── Layout ───────────────────────────────────────────────────────────────────

export default function VendorLayout() {
  const insets = useSafeAreaInsets();
  const { brand } = useTheme();

  const TAB_BAR_VISIBLE = {
    tabBarStyle: {
      backgroundColor: brand.bg,
      borderTopWidth:  1,
      borderTopColor:  brand.border1,
      elevation:       0,
      shadowOpacity:   0,
      paddingBottom:   insets.bottom,
      height:          56 + insets.bottom,
    },
  };

  return (
    <>
      <KycGuard />
      <Tabs
        screenOptions={{
          headerShown:             false,
          tabBarShowLabel:         false,
          tabBarActiveTintColor:   brand.primary,
          tabBarInactiveTintColor: brand.creamMuted,
          ...TAB_BAR_VISIBLE,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ focused }) => (
              <TabIcon label="Home" focused={focused} icon="grid-outline" iconFocused="grid" />
            ),
          }}
        />
        <Tabs.Screen
          name="businesses"
          options={{
            title: 'Business',
            tabBarIcon: ({ focused }) => (
              <TabIcon label="Business" focused={focused} icon="storefront-outline" iconFocused="storefront" />
            ),
          }}
        />
        <Tabs.Screen
          name="payments"
          options={{
            title: 'Payments',
            tabBarIcon: ({ focused }) => (
              <TabIcon label="Pay" focused={focused} icon="wallet-outline" iconFocused="wallet" />
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
        {/* Secondary pages — no tab icon, but bottom bar stays visible */}
        <Tabs.Screen name="orders"            options={{ href: null }} />
        <Tabs.Screen name="print-orders"      options={{ href: null }} />
        <Tabs.Screen name="stores"            options={{ href: null }} />
        <Tabs.Screen name="card"              options={{ href: null }} />
        <Tabs.Screen name="products"          options={{ href: null }} />
        <Tabs.Screen name="commerce-orders"   options={{ href: null }} />
        <Tabs.Screen name="offers"            options={{ href: null }} />
        <Tabs.Screen name="creator-bookings"  options={{ href: null }} />
        <Tabs.Screen name="notifications"     options={{ href: null }} />
        <Tabs.Screen name="print-order-detail" options={{ href: null }} />
        {/* Full-screen wizards — hide tab bar entirely */}
        <Tabs.Screen name="kyc"                  options={{ href: null, ...TAB_BAR_HIDDEN }} />
        <Tabs.Screen name="add-business"         options={{ href: null, ...TAB_BAR_HIDDEN }} />
        <Tabs.Screen name="business-setup"       options={{ href: null, ...TAB_BAR_HIDDEN }} />
        <Tabs.Screen name="slot-calendar"        options={{ href: null, ...TAB_BAR_HIDDEN }} />
        <Tabs.Screen name="create-event"         options={{ href: null, ...TAB_BAR_HIDDEN }} />
        <Tabs.Screen name="event-registrations"  options={{ href: null, ...TAB_BAR_HIDDEN }} />
        <Tabs.Screen name="appointments-board"   options={{ href: null, ...TAB_BAR_HIDDEN }} />
      </Tabs>
    </>
  );
}

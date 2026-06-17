/**
 * Vendor Tab Layout
 * • Ionicons tab icons — no custom SVG, no emojis
 * • Slim active indicator above icon
 * • Tab bar hidden inside kyc/* stack
 * • KycGuard only redirects for pending_review / rejected (not pending/in_progress)
 */

import { useEffect } from 'react';
import { Tabs, router } from 'expo-router';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Brand } from '@/constants/theme';
import { useAuthStore } from '@/stores/auth-store';
import { useKycStore, nextKycStep } from '@/stores/kyc-store';

// ─── Tab Icon ─────────────────────────────────────────────────────────────────

type TabIconProps = {
  label:        string;
  focused:      boolean;
  icon:         keyof typeof Ionicons.glyphMap;
  iconFocused:  keyof typeof Ionicons.glyphMap;
};

function TabIcon({ label, focused, icon, iconFocused }: TabIconProps) {
  return (
    <View style={tab.wrap}>
      <View style={[tab.indicator, focused && tab.indicatorActive]} />
      <Ionicons
        name={focused ? iconFocused : icon}
        size={22}
        color={focused ? Brand.primary : Brand.creamMuted}
      />
      <Text style={[tab.label, focused && tab.labelActive]} numberOfLines={1}>
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
  indicatorActive: {
    backgroundColor: Brand.primary,
  },
  label: {
    fontSize: 10,
    color: Brand.creamMuted,
    fontWeight: '500',
    letterSpacing: 0.1,
  },
  labelActive: {
    color: Brand.primary,
    fontWeight: '700',
  },
});

// ─── KYC Guard ────────────────────────────────────────────────────────────────
// Only redirects for terminal review states. pending / in_progress users can
// navigate freely — the dashboard KycStatusCard shows their status + CTA.

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
        // verified / pending / in_progress → stay on dashboard
      } catch {
        // Network error — let user through
      }
    })();
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}

// ─── Tab bar styles ───────────────────────────────────────────────────────────

const TAB_BAR_VISIBLE = {
  tabBarStyle: {
    backgroundColor:  Brand.bg,
    borderTopWidth:   1,
    borderTopColor:   Brand.border1,
    height:           Platform.select({ ios: 82, android: 64, default: 60 }),
    paddingBottom:    Platform.select({ ios: 24, android: 8, default: 8 }),
    paddingTop:       0,
    elevation:        0,
    shadowOpacity:    0,
  },
} as const;

const TAB_BAR_HIDDEN = {
  tabBarStyle: { display: 'none' as const },
} as const;

// ─── Layout ───────────────────────────────────────────────────────────────────

export default function VendorLayout() {
  return (
    <>
      <KycGuard />
      <Tabs
        screenOptions={{
          headerShown:             false,
          tabBarShowLabel:         false,
          tabBarActiveTintColor:   Brand.primary,
          tabBarInactiveTintColor: Brand.creamMuted,
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
            title: 'Stores',
            tabBarIcon: ({ focused }) => (
              <TabIcon label="Stores" focused={focused} icon="briefcase-outline" iconFocused="briefcase" />
            ),
          }}
        />
        <Tabs.Screen
          name="card"
          options={{
            title: 'Card',
            tabBarIcon: ({ focused }) => (
              <TabIcon label="Card" focused={focused} icon="id-card-outline" iconFocused="id-card" />
            ),
          }}
        />
        <Tabs.Screen
          name="orders"
          options={{
            title: 'Orders',
            tabBarIcon: ({ focused }) => (
              <TabIcon label="Orders" focused={focused} icon="receipt-outline" iconFocused="receipt" />
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
        <Tabs.Screen name="products"     options={{ href: null, ...TAB_BAR_HIDDEN }} />
        <Tabs.Screen name="kyc"          options={{ href: null, ...TAB_BAR_HIDDEN }} />
        <Tabs.Screen name="add-business" options={{ href: null, ...TAB_BAR_HIDDEN }} />
      </Tabs>
    </>
  );
}

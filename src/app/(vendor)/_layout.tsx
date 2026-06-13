/**
 * Vendor Tab Layout
 * • Clean SVG tab icons (react-native-svg, cross-platform)
 * • Tab bar hidden while user is in any kyc/* screen
 * • KycGuard redirects non-verified vendors to the KYC flow on mount
 */

import { useEffect } from 'react';
import { Tabs, router } from 'expo-router';
import { Platform, StyleSheet, Text, View } from 'react-native';
import Svg, { Path, Circle, Rect, Line } from 'react-native-svg';
import { Brand } from '@/constants/theme';
import { useAuthStore } from '@/stores/auth-store';
import { useKycStore, nextKycStep } from '@/stores/kyc-store';

// ─── SVG Icon set ─────────────────────────────────────────────────────────────

type IconProps = { color: string; size?: number };

function IconDashboard({ color, size = 22 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="3" width="8" height="8" rx="2" stroke={color} strokeWidth="1.8" />
      <Rect x="13" y="3" width="8" height="8" rx="2" stroke={color} strokeWidth="1.8" />
      <Rect x="3" y="13" width="8" height="8" rx="2" stroke={color} strokeWidth="1.8" />
      <Rect x="13" y="13" width="8" height="8" rx="2" stroke={color} strokeWidth="1.8" />
    </Svg>
  );
}

function IconProducts({ color, size = 22 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M20.59 13.41L13.42 20.58C13.04 20.97 12.52 21.18 12 21.18C11.48 21.18 10.96 20.97 10.58 20.58L2 12V2H12L20.59 10.59C21.37 11.37 21.37 12.63 20.59 13.41Z"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx="7" cy="7" r="1.5" fill={color} />
    </Svg>
  );
}

function IconOrders({ color, size = 22 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9 5H7C5.9 5 5 5.9 5 7V19C5 20.1 5.9 21 7 21H17C18.1 21 19 20.1 19 19V7C19 5.9 18.1 5 17 5H15"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <Rect x="9" y="3" width="6" height="4" rx="1.5" stroke={color} strokeWidth="1.8" />
      <Line x1="9" y1="12" x2="15" y2="12" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <Line x1="9" y1="16" x2="13" y2="16" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </Svg>
  );
}

function IconProfile({ color, size = 22 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="8" r="3.5" stroke={color} strokeWidth="1.8" />
      <Path
        d="M5 20C5 17.24 8.13 15 12 15C15.87 15 19 17.24 19 20"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </Svg>
  );
}

// ─── Tab icon wrapper ─────────────────────────────────────────────────────────

type TabIconProps = {
  label:   string;
  focused: boolean;
  Icon:    React.ComponentType<IconProps>;
};

function TabIcon({ label, focused, Icon }: TabIconProps) {
  const color = focused ? Brand.primary : Brand.creamMuted;
  return (
    <View style={[tabStyles.wrap, focused && tabStyles.wrapActive]}>
      <Icon color={color} size={21} />
      <Text style={[tabStyles.label, focused && tabStyles.labelActive]}>{label}</Text>
    </View>
  );
}

const tabStyles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
  },
  wrapActive: {
    backgroundColor: 'rgba(124,58,237,0.10)',
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

        if (step === 'verified') return;

        switch (step) {
          case 'pending_review': router.replace('/(vendor)/kyc/pending-review'); break;
          case 'rejected':       router.replace('/(vendor)/kyc/rejected');       break;
          default:               router.replace('/(vendor)/kyc');                break;
        }
      } catch {
        // Network error — let user through, they can retry from within the app
      }
    })();
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}

// ─── Tab bar visibility helper ────────────────────────────────────────────────

const TAB_BAR_VISIBLE = {
  tabBarStyle: {
    backgroundColor: Brand.bg,
    borderTopWidth: 1,
    borderTopColor: Brand.border1,
    height:        Platform.select({ ios: 82, android: 68, default: 60 }),
    paddingBottom: Platform.select({ ios: 26, android: 10, default: 8 }),
    paddingTop: 8,
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
          headerShown: false,
          tabBarShowLabel: false,
          tabBarActiveTintColor:   Brand.primary,
          tabBarInactiveTintColor: Brand.creamMuted,
          ...TAB_BAR_VISIBLE,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Dashboard',
            tabBarIcon: ({ focused }) => <TabIcon label="Dashboard" focused={focused} Icon={IconDashboard} />,
          }}
        />
        <Tabs.Screen
          name="products"
          options={{
            title: 'Products',
            tabBarIcon: ({ focused }) => <TabIcon label="Products" focused={focused} Icon={IconProducts} />,
          }}
        />
        <Tabs.Screen
          name="orders"
          options={{
            title: 'Orders',
            tabBarIcon: ({ focused }) => <TabIcon label="Orders" focused={focused} Icon={IconOrders} />,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ focused }) => <TabIcon label="Profile" focused={focused} Icon={IconProfile} />,
          }}
        />

        {/* KYC stack — hidden from tab bar, no tab bar shown while active */}
        <Tabs.Screen
          name="kyc"
          options={{
            href: null,
            ...TAB_BAR_HIDDEN,
          }}
        />
      </Tabs>
    </>
  );
}

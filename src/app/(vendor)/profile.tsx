/**
 * Vendor Profile
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

import { Radius, Spacing } from '@/constants/theme';
import { useAuthStore } from '@/stores/auth-store';
import VendorHeader from '@/components/vendor/VendorHeader';
import { useTheme } from '@/hooks/useTheme';
import type { BrandTokens } from '@/hooks/useTheme';

type MenuItem = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  sub: string;
  onPress?: () => void;
};

const createStyles = (brand: BrandTokens) => StyleSheet.create({
  root:    { flex: 1, backgroundColor: brand.bg },
  content: { paddingHorizontal: Spacing.four, paddingTop: Spacing.four, paddingBottom: 100, gap: Spacing.four },

  // Profile section
  profileSection: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText:  { color: '#fff', fontSize: 20, fontWeight: '700' },
  profileInfo: { flex: 1, gap: 2 },
  name:  { color: brand.cream, fontSize: 18, fontWeight: '700' },
  phone: { color: brand.creamSub, fontSize: 13 },

  vendorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: Spacing.two,
    paddingVertical: 5,
    borderRadius: Radius.pill,
    backgroundColor: brand.surface1,
    borderWidth: 1,
    borderColor: brand.border1,
  },
  badgeDot:  { width: 6, height: 6, borderRadius: 3, backgroundColor: brand.success },
  badgeText: { color: brand.creamSub, fontSize: 11, fontWeight: '600' },

  divider: { height: 1, backgroundColor: brand.border1 },

  // Menu
  menuCard: {
    backgroundColor: brand.surface1,
    borderWidth: 1,
    borderColor: brand.border1,
    borderRadius: Radius.xl,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: 14,
    gap: Spacing.two,
  },
  menuItemBorder:   { borderBottomWidth: 1, borderBottomColor: brand.border1 },
  menuItemPressed:  { backgroundColor: brand.surface2 },
  menuIconWrap: {
    width: 34,
    height: 34,
    borderRadius: Radius.md,
    backgroundColor: brand.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLeft:  { flex: 1, gap: 2 },
  menuLabel: { color: brand.cream, fontSize: 15, fontWeight: '600' },
  menuSub:   { color: brand.creamMuted, fontSize: 12 },

  // Sign out
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: 'rgba(220,38,38,0.20)',
    backgroundColor: 'rgba(220,38,38,0.04)',
  },
  signOutText: { color: brand.error, fontSize: 15, fontWeight: '700' },

  version: { color: brand.creamMuted, fontSize: 11, textAlign: 'center' },
});

export default function VendorProfileScreen() {
  const { name, phone, clearAuth } = useAuthStore();
  const initial = (name ?? 'V').charAt(0).toUpperCase();

  const { brand } = useTheme();
  const s = useMemo(() => createStyles(brand), [brand]);

  const MENU_ITEMS: MenuItem[] = [
    { icon: 'business-outline',       label: 'Business Profile',  sub: 'Name, category, GST' },
    { icon: 'card-outline',           label: 'Payment Settings',  sub: 'Bank account, UPI', onPress: () => router.push('/(vendor)/withdrawals' as never) },
    { icon: 'notifications-outline',  label: 'Notifications',     sub: 'Orders, reviews, promotions' },
    { icon: 'help-circle-outline',    label: 'Help & Support',    sub: 'Raise a ticket, chat with support', onPress: () => router.push('/(vendor)/support' as never) },
  ];

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <VendorHeader />
      <ScrollView
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar + info */}
        <Animated.View entering={FadeInDown.delay(50)} style={s.profileSection}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{initial}</Text>
          </View>
          <View style={s.profileInfo}>
            <Text style={s.name}>{name ?? "Vendor"}</Text>
            <Text style={s.phone}>{phone ?? ""}</Text>
          </View>
          <View style={s.vendorBadge}>
            <View style={s.badgeDot} />
            <Text style={s.badgeText}>Vendor</Text>
          </View>
        </Animated.View>

        <View style={s.divider} />

        {/* Menu */}
        <Animated.View entering={FadeInDown.delay(150)} style={s.menuCard}>
          {MENU_ITEMS.map((item, i) => (
            <Pressable
              key={item.label}
              onPress={item.onPress}
              style={({ pressed }) => [
                s.menuItem,
                i < MENU_ITEMS.length - 1 && s.menuItemBorder,
                pressed && s.menuItemPressed,
              ]}
            >
              <View style={s.menuIconWrap}>
                <Ionicons name={item.icon} size={18} color={brand.creamSub} />
              </View>
              <View style={s.menuLeft}>
                <Text style={s.menuLabel}>{item.label}</Text>
                <Text style={s.menuSub}>{item.sub}</Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={brand.creamMuted}
              />
            </Pressable>
          ))}
        </Animated.View>

        {/* Sign out */}
        <Animated.View entering={FadeInDown.delay(250)}>
          <Pressable
            style={({ pressed }) => [s.signOutBtn, pressed && { opacity: 0.7 }]}
            onPress={() => {
              clearAuth();
              router.replace("/(auth)/welcome");
            }}
          >
            <Ionicons name="log-out-outline" size={18} color={brand.error} />
            <Text style={s.signOutText}>Sign Out</Text>
          </Pressable>
        </Animated.View>

        <Text style={s.version}>Ruxstar v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

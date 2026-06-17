/**
 * Vendor Profile
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView, StatusBar, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

import { Brand, Radius, Spacing } from '@/constants/theme';
import { useAuthStore } from '@/stores/auth-store';

type MenuItem = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  sub: string;
  onPress?: () => void;
};

export default function VendorProfileScreen() {
  const insets  = useSafeAreaInsets();
  const { name, phone, clearAuth } = useAuthStore();    
  const initial = (name ?? 'V').charAt(0).toUpperCase();

  const MENU_ITEMS: MenuItem[] = [
    { icon: 'business-outline',       label: 'Business Profile',  sub: 'Name, category, GST' },
    { icon: 'card-outline',           label: 'Payment Settings',  sub: 'Bank account, UPI' },
    { icon: 'notifications-outline',  label: 'Notifications',     sub: 'Orders, reviews, promotions' },
    { icon: 'help-circle-outline',    label: 'Help & Support',    sub: 'FAQs, contact us' },
  ];

  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor={Brand.bg} />
      <ScrollView
        contentContainerStyle={[
          s.content,
          {
            paddingTop: insets.top + Spacing.three,
            paddingBottom: insets.bottom + Spacing.six,
          },
        ]}
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
                <Ionicons name={item.icon} size={18} color={Brand.creamSub} />
              </View>
              <View style={s.menuLeft}>
                <Text style={s.menuLabel}>{item.label}</Text>
                <Text style={s.menuSub}>{item.sub}</Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={Brand.creamMuted}
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
            <Ionicons name="log-out-outline" size={18} color={Brand.error} />
            <Text style={s.signOutText}>Sign Out</Text>
          </Pressable>
        </Animated.View>

        <Text style={s.version}>Ruxstar v1.0.0</Text>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: Brand.bg },
  content: { paddingHorizontal: Spacing.four, gap: Spacing.four },

  // Profile section
  profileSection: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText:  { color: '#fff', fontSize: 20, fontWeight: '700' },
  profileInfo: { flex: 1, gap: 2 },
  name:  { color: Brand.cream, fontSize: 18, fontWeight: '700' },
  phone: { color: Brand.creamSub, fontSize: 13 },

  vendorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: Spacing.two,
    paddingVertical: 5,
    borderRadius: Radius.pill,
    backgroundColor: Brand.surface1,
    borderWidth: 1,
    borderColor: Brand.border1,
  },
  badgeDot:  { width: 6, height: 6, borderRadius: 3, backgroundColor: Brand.success },
  badgeText: { color: Brand.creamSub, fontSize: 11, fontWeight: '600' },

  divider: { height: 1, backgroundColor: Brand.border1 },

  // Menu
  menuCard: {
    backgroundColor: Brand.surface1,
    borderWidth: 1,
    borderColor: Brand.border1,
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
  menuItemBorder:   { borderBottomWidth: 1, borderBottomColor: Brand.border1 },
  menuItemPressed:  { backgroundColor: Brand.surface2 },
  menuIconWrap: {
    width: 34,
    height: 34,
    borderRadius: Radius.md,
    backgroundColor: Brand.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLeft:  { flex: 1, gap: 2 },
  menuLabel: { color: Brand.cream, fontSize: 15, fontWeight: '600' },
  menuSub:   { color: Brand.creamMuted, fontSize: 12 },

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
  signOutText: { color: Brand.error, fontSize: 15, fontWeight: '700' },

  version: { color: Brand.creamMuted, fontSize: 11, textAlign: 'center' },
});

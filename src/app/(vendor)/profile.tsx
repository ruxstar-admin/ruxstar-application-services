/**
 * Vendor Profile — CRED-style
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView, StatusBar, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';

import PrimaryButton from '@/components/ui/PrimaryButton';
import { Brand, Radius, Spacing } from '@/constants/theme';
import { useAuthStore } from '@/stores/auth-store';

const MENU_ITEMS = [
  { label: 'Business Profile',  sub: 'Name, category, GST' },
  { label: 'Payment Settings',  sub: 'Bank account, UPI' },
  { label: 'Notifications',     sub: 'Orders, reviews, promotions' },
  { label: 'Help & Support',    sub: 'FAQs, contact us' },
];

export default function VendorProfileScreen() {
  const insets = useSafeAreaInsets();
  const { name, phone, clearAuth } = useAuthStore();
  const initial = (name ?? 'V').charAt(0).toUpperCase();

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={Brand.bg} />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + Spacing.three, paddingBottom: Spacing.six },
        ]}
        showsVerticalScrollIndicator={false}>

        {/* Avatar + info */}
        <Animated.View entering={FadeInDown.delay(50)} style={styles.profileSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <View>
            <Text style={styles.name}>{name ?? 'Vendor'}</Text>
            <Text style={styles.phone}>{phone ?? ''}</Text>
          </View>
          <View style={styles.vendorBadge}>
            <View style={styles.badgeDot} />
            <Text style={styles.badgeText}>Vendor</Text>
          </View>
        </Animated.View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Menu */}
        <Animated.View entering={FadeInDown.delay(150)} style={styles.menuCard}>
          {MENU_ITEMS.map((item, i) => (
            <Pressable
              key={i}
              style={[styles.menuItem, i < MENU_ITEMS.length - 1 && styles.menuItemBorder]}>
              <View style={styles.menuLeft}>
                <Text style={styles.menuLabel}>{item.label}</Text>
                <Text style={styles.menuSub}>{item.sub}</Text>
              </View>
              <Text style={styles.menuArrow}>→</Text>
            </Pressable>
          ))}
        </Animated.View>

        {/* Sign out */}
        <Animated.View entering={FadeInDown.delay(250)}>
          <PrimaryButton
            label="Sign Out"
            onPress={() => { clearAuth(); router.replace('/(auth)/welcome'); }}
            variant="outline"
            icon="←"
            iconPosition="left"
          />
        </Animated.View>

        <Text style={styles.version}>Ruxstar v1.0.0</Text>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Brand.bg },
  content: { paddingHorizontal: Spacing.four, gap: Spacing.four },

  profileSection: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  avatar: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: Brand.primary,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: Brand.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 10, elevation: 6,
  },
  avatarText: { color: '#fff', fontSize: 22, fontWeight: '700' },
  name: { color: Brand.cream, fontSize: 20, fontWeight: '700' },
  phone: { color: Brand.creamSub, fontSize: 14, marginTop: 2 },
  vendorBadge: {
    marginLeft: 'auto',
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: Spacing.two, paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: Brand.surface1,
    borderWidth: 1, borderColor: Brand.border1,
  },
  badgeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Brand.primaryLight },
  badgeText: { color: Brand.creamSub, fontSize: 11, fontWeight: '600' },

  divider: { height: 1, backgroundColor: Brand.border1 },

  menuCard: {
    backgroundColor: Brand.surface1,
    borderWidth: 1, borderColor: Brand.border1,
    borderRadius: Radius.xl, overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.three, paddingVertical: 16,
  },
  menuItemBorder: { borderBottomWidth: 1, borderBottomColor: Brand.border1 },
  menuLeft: { flex: 1, gap: 2 },
  menuLabel: { color: Brand.cream, fontSize: 15, fontWeight: '600' },
  menuSub:   { color: Brand.creamMuted, fontSize: 12 },
  menuArrow: { color: Brand.creamMuted, fontSize: 16 },

  version: { color: Brand.creamMuted, fontSize: 11, textAlign: 'center' },
});

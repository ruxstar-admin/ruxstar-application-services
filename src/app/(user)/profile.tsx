/**
 * User Profile Screen
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';

import PrimaryButton from '@/components/ui/PrimaryButton';
import { Brand, Gradients, Radius, Spacing } from '@/constants/theme';
import { useAuthStore } from '@/stores/auth-store';

const MENU_ITEMS = [
  { icon: 'ðŸ“¦', label: 'My Orders', desc: 'Track your current orders' },
  { icon: 'â¤ï¸', label: 'Saved Vendors', desc: 'Your favourite vendors' },
  { icon: 'ðŸ“', label: 'Addresses', desc: 'Manage saved addresses' },
  { icon: 'ðŸ’³', label: 'Payments', desc: 'Payment methods' },
  { icon: 'ðŸ””', label: 'Notifications', desc: 'Alert preferences' },
  { icon: 'ðŸ”’', label: 'Privacy & Security', desc: 'Account security settings' },
  { icon: 'â“', label: 'Help & Support', desc: 'Get help from our team' },
];

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { name, phone, clearAuth } = useAuthStore();
  const firstName = name?.split(' ')[0] ?? 'User';

  const handleSignOut = () => {
    clearAuth();
    router.replace('/(auth)/welcome');
  };

  return (
    <LinearGradient colors={['#FFFFFF', '#F5F5F7']} style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + Spacing.three, paddingBottom: Spacing.six },
        ]}
        showsVerticalScrollIndicator={false}>

        {/* Profile header */}
        <Animated.View entering={FadeInDown.delay(50)} style={styles.profileHeader}>
          <LinearGradient
            colors={Gradients.primaryButton}
            style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(name ?? 'U').charAt(0).toUpperCase()}
            </Text>
          </LinearGradient>
          <Text style={styles.userName}>{name ?? 'User'}</Text>
          <Text style={styles.userPhone}>{phone ?? ''}</Text>
          <View style={styles.badgeRow}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>ðŸ‘¤ Customer</Text>
            </View>
          </View>
        </Animated.View>

        {/* Menu items */}
        <Animated.View entering={FadeInDown.delay(200)} style={styles.menuSection}>
          {MENU_ITEMS.map((item, i) => (
            <Pressable key={i} style={styles.menuItem}>
              <View style={styles.menuIconCircle}>
                <Text style={styles.menuIcon}>{item.icon}</Text>
              </View>
              <View style={styles.menuText}>
                <Text style={styles.menuLabel}>{item.label}</Text>
                <Text style={styles.menuDesc}>{item.desc}</Text>
              </View>
              <Text style={styles.menuChevron}>â€º</Text>
            </Pressable>
          ))}
        </Animated.View>

        {/* Sign out */}
        <Animated.View entering={FadeInDown.delay(350)}>
          <PrimaryButton
            label="Sign Out"
            onPress={handleSignOut}
            variant="outline"
            icon="â†©"
            iconPosition="left"
          />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(400)} style={styles.footer}>
          <Text style={styles.version}>Ruxstar v1.0.0</Text>
        </Animated.View>

      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    paddingHorizontal: Spacing.four,
    gap: Spacing.four,
  },
  profileHeader: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.three,
  },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Brand.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  avatarText: { color: '#fff', fontSize: 36, fontWeight: '700' },
  userName: { color: Brand.textOnDark, fontSize: 22, fontWeight: '700' },
  userPhone: { color: Brand.textOnDarkSecondary, fontSize: 14 },
  badgeRow: { flexDirection: 'row', gap: Spacing.two },
  badge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 4,
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(32,138,239,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(32,138,239,0.3)',
  },
  badgeText: { color: Brand.primary, fontSize: 12, fontWeight: '600' },
  menuSection: {
    backgroundColor: Brand.surfaceCard,
    borderWidth: 1,
    borderColor: Brand.surfaceCardBorder,
    borderRadius: Radius.xl,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderBottomWidth: 1,
    borderBottomColor: Brand.surfaceCardBorder,
  },
  menuIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuIcon: { fontSize: 18 },
  menuText: { flex: 1 },
  menuLabel: { color: Brand.textOnDark, fontSize: 15, fontWeight: '600' },
  menuDesc: { color: Brand.textOnDarkMuted, fontSize: 12, marginTop: 1 },
  menuChevron: { color: Brand.textOnDarkMuted, fontSize: 20, fontWeight: '300' },
  footer: { alignItems: 'center' },
  version: { color: Brand.textOnDarkMuted, fontSize: 12 },
});

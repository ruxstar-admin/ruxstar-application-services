/**
 * Customer Home — skeleton placeholder
 * Shows role confirmation + logout (mirrors web customer/page.tsx)
 */

import React from 'react';
import {
  View, Text, StyleSheet, StatusBar, Pressable,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Brand, Spacing, Radius } from '@/constants/theme';
import { useAuthStore } from '@/stores/auth-store';

export default function UserHomeScreen() {
  const insets = useSafeAreaInsets();
  const { name, clearAuth } = useAuthStore();

  function handleLogout() {
    clearAuth();
    router.replace('/(auth)/welcome');
  }

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={Brand.bg} />

      {/* Header */}
      <View style={s.header}>
        <Text style={s.brand}>Ruxstar</Text>
        <View style={s.headerRight}>
          {name ? <Text style={s.userName}>{name}</Text> : null}
          <Pressable style={s.logoutBtn} onPress={handleLogout}>
            <Text style={s.logoutText}>Log out</Text>
          </Pressable>
        </View>
      </View>

      {/* Body */}
      <View style={s.body}>
        <View style={s.roleChip}>
          <Text style={s.roleChipText}>🛍️  Customer</Text>
        </View>
        <Text style={s.comingSoon}>Customer dashboard — coming soon</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Brand.bg },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderBottomWidth: 1,
    borderBottomColor: Brand.border1,
  },
  brand: {
    color: Brand.cream,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  userName: {
    color: Brand.creamMuted,
    fontSize: 13,
  },
  logoutBtn: {
    paddingHorizontal: Spacing.three,
    paddingVertical: 8,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Brand.border2,
  },
  logoutText: {
    color: Brand.creamSub,
    fontSize: 13,
    fontWeight: '600',
  },

  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
  },
  roleChip: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: Radius.pill,
    backgroundColor: Brand.surface1,
    borderWidth: 1,
    borderColor: Brand.border1,
  },
  roleChipText: {
    color: Brand.cream,
    fontSize: 15,
    fontWeight: '600',
  },
  comingSoon: {
    color: 'rgba(0,0,0,0.35)',
    fontSize: 13,
  },
});

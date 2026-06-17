/**
 * My Businesses Screen
 */

import React, { useEffect } from 'react';
import {
  View, Text, StyleSheet, StatusBar,
  FlatList, Pressable, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

import { Brand, Radius, Spacing } from '@/constants/theme';
import { useAuthStore } from '@/stores/auth-store';
import { useKycStore } from '@/stores/kyc-store';
import { useBusinessStore } from '@/stores/business-store';
import BusinessCard from '@/components/vendor/BusinessCard';

export default function BusinessesScreen() {
  const insets  = useSafeAreaInsets();
  const { userId } = useAuthStore();
  const kycStatus  = useKycStore((s) => s.status);
  const { businesses, loading, loadBusinesses, removeBusiness } = useBusinessStore();

  const kycVerified = kycStatus?.status === 'verified';

  useEffect(() => {
    if (userId) loadBusinesses(userId);
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleRemove(id: string) {
    if (!userId) return;
    await removeBusiness(userId, id);
  }

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={[s.root, { paddingTop: insets.top }]}>
        <StatusBar barStyle="dark-content" backgroundColor={Brand.bg} />
        <ScreenHeader title="Businesses" />
        <View style={s.center}>
          <ActivityIndicator color={Brand.primary} size="large" />
        </View>
      </View>
    );
  }

  // ── Empty state ──────────────────────────────────────────────────────────────
  const Empty = () => (
    <Animated.View entering={FadeInDown.delay(100)} style={s.empty}>
      <View style={s.stateIconWrap}>
        <Ionicons name="storefront-outline" size={30} color={Brand.creamMuted} />
      </View>
      <Text style={s.stateTitle}>No businesses yet</Text>
      <Text style={s.stateSub}>
        Add your first business listing to get started on Ruxstar.
      </Text>
      <Pressable
        style={s.stateBtn}
        onPress={() => router.push('/(vendor)/add-business' as never)}
      >
        <Ionicons name="add" size={18} color="#fff" />
        <Text style={s.stateBtnText}>Add your first business</Text>
      </Pressable>
    </Animated.View>
  );

  // ── List ─────────────────────────────────────────────────────────────────────
  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={Brand.bg} />

      <ScreenHeader
        title="Businesses"
        right={kycVerified ? (
          <Pressable
            style={s.addBtn}
            onPress={() => router.push('/(vendor)/add-business' as never)}
          >
            <Ionicons name="add" size={16} color="#fff" />
            <Text style={s.addBtnText}>Add</Text>
          </Pressable>
        ) : undefined}
      />

      <FlatList
        data={businesses}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <BusinessCard business={item} onRemove={handleRemove} delay={index * 60} />
        )}
        ListHeaderComponent={!kycVerified ? <KycBanner /> : null}
        ListEmptyComponent={kycVerified ? <Empty /> : null}
        contentContainerStyle={[s.listContent, { paddingBottom: insets.bottom + 88 }]}
        showsVerticalScrollIndicator={false}
      />

      {/* FAB — compact, only when list has items */}
      {businesses.length > 0 && (
        <Pressable
          style={[s.fab, { bottom: insets.bottom + 20 }]}
          onPress={() => router.push('/(vendor)/add-business' as never)}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </Pressable>
      )}
    </View>
  );
}

// ─── KYC Banner ──────────────────────────────────────────────────────────────

function KycBanner() {
  return (
    <Animated.View entering={FadeInDown.delay(60)} style={s.kycBanner}>
      <View style={s.kycBannerIcon}>
        <Ionicons name="lock-closed-outline" size={18} color={Brand.warning} />
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={s.kycBannerTitle}>KYC required to add businesses</Text>
        <Text style={s.kycBannerSub}>Complete identity verification to manage your listings.</Text>
      </View>
      <Pressable
        style={s.kycBannerBtn}
        onPress={() => router.push('/(vendor)/kyc' as never)}
      >
        <Text style={s.kycBannerBtnText}>Start</Text>
        <Ionicons name="arrow-forward" size={13} color={Brand.warning} />
      </Pressable>
    </Animated.View>
  );
}

// ─── Screen Header ────────────────────────────────────────────────────────────

function ScreenHeader({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
    <View style={s.header}>
      <Text style={s.headerTitle}>{title}</Text>
      {right ?? null}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: Brand.bg },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.five,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderBottomWidth: 1,
    borderBottomColor: Brand.border1,
  },
  headerTitle: { color: Brand.cream, fontSize: 20, fontWeight: '800', letterSpacing: -0.4 },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.two + 4,
    paddingVertical: 8,
    borderRadius: Radius.pill,
    backgroundColor: Brand.primary,
  },
  addBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  listContent: { padding: Spacing.four, gap: Spacing.two },

  // Shared empty / gate state
  empty: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingTop: Spacing.six,
  },
  stateIconWrap: {
    width: 72, height: 72,
    borderRadius: Radius.xl,
    backgroundColor: Brand.surface2,
    borderWidth: 1,
    borderColor: Brand.border1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.two,
  },
  stateTitle: { color: Brand.cream, fontSize: 20, fontWeight: '800', textAlign: 'center' },
  stateSub:   { color: Brand.creamSub, fontSize: 14, textAlign: 'center', lineHeight: 20 },
  stateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingVertical: 14,
    borderRadius: Radius.pill,
    backgroundColor: Brand.primary,
  },
  stateBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  // KYC banner
  kycBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    backgroundColor: 'rgba(217,119,6,0.06)',
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: 'rgba(217,119,6,0.20)',
    padding: Spacing.three,
    marginBottom: Spacing.two,
  },
  kycBannerIcon: {
    width: 36, height: 36, borderRadius: Radius.md,
    backgroundColor: 'rgba(217,119,6,0.10)',
    alignItems: 'center', justifyContent: 'center',
  },
  kycBannerTitle: { color: Brand.cream, fontSize: 13, fontWeight: '700' },
  kycBannerSub:   { color: Brand.creamSub, fontSize: 11, lineHeight: 16 },
  kycBannerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(217,119,6,0.30)',
    backgroundColor: 'rgba(217,119,6,0.08)',
  },
  kycBannerBtnText: { color: Brand.warning, fontSize: 12, fontWeight: '700' },

  // FAB
  fab: {
    position: 'absolute',
    right: Spacing.four,
    width: 48, height: 48,
    borderRadius: 24,
    backgroundColor: Brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Brand.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
});

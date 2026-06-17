/**
 * Vendor Dashboard
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet, StatusBar, Pressable, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

import { Brand, Radius, Spacing } from '@/constants/theme';
import { useAuthStore } from '@/stores/auth-store';
import { useKycStore } from '@/stores/kyc-store';
import { useBusinessStore } from '@/stores/business-store';
import KycStatusCard from '@/components/vendor/KycStatusCard';

export default function VendorDashboard() {
  const insets      = useSafeAreaInsets();
  const { name, userId, clearAuth } = useAuthStore();
  const kycStatus   = useKycStore((s) => s.status);
  const businesses  = useBusinessStore((s) => s.businesses);
  const loadBusinesses = useBusinessStore((s) => s.loadBusinesses);

  const kycVerified = kycStatus?.status === 'verified';

  useEffect(() => {
    if (userId) loadBusinesses(userId);
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleLogout() {
    clearAuth();
    router.replace('/(auth)/welcome');
  }

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  })();

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={Brand.bg} />

      {/* Header */}
      <View style={s.header}>
        <Text style={s.brand}>Ruxstar</Text>
        <Pressable style={s.logoutBtn} onPress={handleLogout} hitSlop={8}>
          <Ionicons name="log-out-outline" size={18} color={Brand.creamSub} />
          <Text style={s.logoutText}>Log out</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[s.body, { paddingBottom: insets.bottom + Spacing.six }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Greeting */}
        <Animated.View entering={FadeInDown.delay(0)} style={s.greetingBlock}>
          <Text style={s.greeting}>{greeting}</Text>
          <Text style={s.userName}>{name ?? 'Vendor'}</Text>
          <Text style={s.tagline}>Manage your business on Ruxstar</Text>
        </Animated.View>

        {/* KYC Status Card */}
        {kycStatus ? (
          <KycStatusCard
            status={kycStatus.status}
            rejectReason={kycStatus.message}
            delay={80}
          />
        ) : null}

        {/* Stats */}
        <Animated.View entering={FadeInDown.delay(160)} style={s.statsRow}>
          <StatCard
            icon="briefcase-outline"
            value={String(businesses.length)}
            label={businesses.length === 1 ? 'Business' : 'Businesses'}
          />
          <StatCard
            icon={kycVerified ? 'checkmark-circle-outline' : 'time-outline'}
            iconColor={kycVerified ? Brand.success : Brand.warning}
            value={kycVerified ? 'Verified' : 'Pending'}
            label="KYC Status"
          />
        </Animated.View>

        {/* CTAs */}
        <Animated.View entering={FadeInDown.delay(240)} style={s.ctaGroup}>
          {kycVerified ? (
            <>
              <CtaRow
                icon="briefcase-outline"
                label="My Businesses"
                sub="Add or manage your listings"
                onPress={() => router.push('/(vendor)/businesses' as never)}
              />
              <CtaRow
                icon="receipt-outline"
                label="Orders"
                sub="View incoming orders"
                onPress={() => router.push('/(vendor)/orders' as never)}
                muted
              />
            </>
          ) : (
            <CtaRow
              icon="id-card-outline"
              label="Complete KYC"
              sub="Verify your identity to unlock all features"
              onPress={() => router.push('/(vendor)/kyc' as never)}
            />
          )}
        </Animated.View>

        {/* Tip */}
        <Animated.View entering={FadeInDown.delay(320)} style={s.tip}>
          <Ionicons name="information-circle-outline" size={16} color={Brand.primary} style={{ marginTop: 1 }} />
          <Text style={s.tipText}>
            {kycVerified
              ? 'Long-press any business card to remove it.'
              : 'Complete KYC to start listing your business on Ruxstar.'}
          </Text>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  icon, value, label, iconColor,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  label: string;
  iconColor?: string;
}) {
  return (
    <View style={s.statCard}>
      <Ionicons name={icon} size={20} color={iconColor ?? Brand.creamMuted} />
      <Text style={s.statValue}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

// ─── CTA Row ──────────────────────────────────────────────────────────────────

function CtaRow({
  icon, label, sub, onPress, muted,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  sub: string;
  onPress: () => void;
  muted?: boolean;
}) {
  return (
    <Pressable
      style={({ pressed }) => [s.ctaBtn, muted && s.ctaBtnMuted, pressed && s.ctaBtnPressed]}
      onPress={onPress}
    >
      <View style={s.ctaIconWrap}>
        <Ionicons name={icon} size={20} color={muted ? Brand.creamMuted : Brand.primary} />
      </View>
      <View style={s.ctaText}>
        <Text style={[s.ctaLabel, muted && s.ctaLabelMuted]}>{label}</Text>
        <Text style={s.ctaSub}>{sub}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={Brand.creamMuted} />
    </Pressable>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

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
  brand: { color: Brand.cream, fontSize: 18, fontWeight: '800', letterSpacing: -0.4 },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: Spacing.two + 4,
    paddingVertical: 7,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Brand.border2,
  },
  logoutText: { color: Brand.creamSub, fontSize: 13, fontWeight: '600' },

  body: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    gap: Spacing.three,
  },

  greetingBlock: { gap: 2 },
  greeting:  { color: Brand.creamSub, fontSize: 14 },
  userName:  { color: Brand.cream, fontSize: 26, fontWeight: '800', letterSpacing: -0.6, marginTop: 1 },
  tagline:   { color: Brand.creamMuted, fontSize: 13, marginTop: 2 },

  statsRow: { flexDirection: 'row', gap: Spacing.two },
  statCard: {
    flex: 1,
    backgroundColor: Brand.surface1,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Brand.border1,
    padding: Spacing.three,
    alignItems: 'flex-start',
    gap: 4,
  },
  statValue: { color: Brand.cream, fontSize: 20, fontWeight: '800', letterSpacing: -0.4 },
  statLabel: { color: Brand.creamMuted, fontSize: 12 },

  ctaGroup: { gap: Spacing.two },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Brand.surface1,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Brand.border1,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  ctaBtnMuted:    { opacity: 0.55 },
  ctaBtnPressed:  { opacity: 0.75 },
  ctaIconWrap: {
    width: 38,
    height: 38,
    borderRadius: Radius.md,
    backgroundColor: Brand.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText:       { flex: 1, gap: 2 },
  ctaLabel:      { color: Brand.cream, fontSize: 15, fontWeight: '700' },
  ctaLabelMuted: { color: Brand.creamSub },
  ctaSub:        { color: Brand.creamMuted, fontSize: 12 },

  tip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
    backgroundColor: 'rgba(124,58,237,0.05)',
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.15)',
    padding: Spacing.two + 4,
  },
  tipText: { color: Brand.creamSub, fontSize: 12, flex: 1, lineHeight: 18 },
});

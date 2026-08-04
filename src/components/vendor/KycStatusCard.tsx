/**
 * KycStatusCard — colour-coded KYC status with Ionicons, no emojis
 */

import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

import { Radius, Spacing } from '@/constants/theme';
import type { KycOverallStatus } from '@/services/kyc-service';
import { useTheme } from '@/hooks/useTheme';
import type { BrandTokens } from '@/hooks/useTheme';

type StatusConfig = {
  icon:      keyof typeof Ionicons.glyphMap;
  iconColor: (brand: BrandTokens) => string;
  label:     string;
  sublabel:  string;
  bg:        string;
  border:    string;
  ctaLabel:  string | null;
  ctaRoute:  string | null;
};

const STATUS_CONFIG: Record<KycOverallStatus, StatusConfig> = {
  pending: {
    icon:      'time-outline',
    iconColor: (brand) => brand.warning,
    label:     'KYC Pending',
    sublabel:  'Complete verification to unlock all features.',
    bg:        'rgba(217,119,6,0.06)',
    border:    'rgba(217,119,6,0.20)',
    ctaLabel:  'Start KYC',
    ctaRoute:  '/(vendor)/kyc',
  },
  in_progress: {
    icon:      'id-card-outline',
    iconColor: (brand) => brand.primary,
    label:     'KYC In Progress',
    sublabel:  'Continue where you left off.',
    bg:        'rgba(124,58,237,0.06)',
    border:    'rgba(124,58,237,0.20)',
    ctaLabel:  'Continue KYC',
    ctaRoute:  '/(vendor)/kyc',
  },
  pending_review: {
    icon:      'hourglass-outline',
    iconColor: (brand) => brand.primary,
    label:     'Under Review',
    sublabel:  'Our team is verifying your documents. This usually takes a few hours.',
    bg:        'rgba(124,58,237,0.06)',
    border:    'rgba(124,58,237,0.20)',
    ctaLabel:  null,
    ctaRoute:  null,
  },
  verified: {
    icon:      'checkmark-circle-outline',
    iconColor: (brand) => brand.success,
    label:     'KYC Verified',
    sublabel:  'Your identity is verified. All features are unlocked.',
    bg:        'rgba(22,163,74,0.06)',
    border:    'rgba(22,163,74,0.20)',
    ctaLabel:  null,
    ctaRoute:  null,
  },
  rejected: {
    icon:      'alert-circle-outline',
    iconColor: (brand) => brand.error,
    label:     'KYC Rejected',
    sublabel:  'Your verification was rejected. Please re-submit.',
    bg:        'rgba(220,38,38,0.06)',
    border:    'rgba(220,38,38,0.20)',
    ctaLabel:  'Re-submit KYC',
    ctaRoute:  '/(vendor)/kyc',
  },
};

const createStyles = (brand: BrandTokens) => StyleSheet.create({
  card: {
    borderRadius: Radius.xl,
    borderWidth:  1,
    padding:      Spacing.three,
    gap:          Spacing.two,
  },
  row: {
    flexDirection: 'row',
    alignItems:    'flex-start',
    gap:           Spacing.two,
  },
  iconWrap: {
    width:  38,
    height: 38,
    borderRadius: Radius.md,
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textBlock: { flex: 1, gap: 3 },
  label:     { fontSize: 14, fontWeight: '700', letterSpacing: -0.2 },
  sublabel:  { color: brand.creamSub, fontSize: 13, lineHeight: 18 },
  rejectReason: { color: brand.error, fontSize: 12, marginTop: 2, lineHeight: 16 },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.three,
    paddingVertical: 8,
    borderRadius: Radius.pill,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  ctaText: { fontSize: 13, fontWeight: '700' },
});

type Props = {
  status:        KycOverallStatus;
  rejectReason?: string;
  delay?:        number;
};

export default function KycStatusCard({ status, rejectReason, delay = 0 }: Props) {
  const { brand } = useTheme();
  const s = useMemo(() => createStyles(brand), [brand]);
  const cfg = STATUS_CONFIG[status];
  const iconColor = cfg.iconColor(brand);

  return (
    <Animated.View
      entering={FadeInDown.delay(delay)}
      style={[s.card, { backgroundColor: cfg.bg, borderColor: cfg.border }]}
    >
      <View style={s.row}>
        <View style={[s.iconWrap, { borderColor: cfg.border }]}>
          <Ionicons name={cfg.icon} size={20} color={iconColor} />
        </View>
        <View style={s.textBlock}>
          <Text style={[s.label, { color: iconColor }]}>{cfg.label}</Text>
          <Text style={s.sublabel}>{cfg.sublabel}</Text>
          {rejectReason && status === 'rejected' ? (
            <Text style={s.rejectReason}>Reason: {rejectReason}</Text>
          ) : null}
        </View>
      </View>

      {cfg.ctaLabel && cfg.ctaRoute ? (
        <Pressable
          style={({ pressed }) => [s.cta, { borderColor: cfg.border }, pressed && { opacity: 0.7 }]}
          onPress={() => router.push(cfg.ctaRoute as never)}
        >
          <Text style={[s.ctaText, { color: iconColor }]}>{cfg.ctaLabel}</Text>
          <Ionicons name="arrow-forward" size={13} color={iconColor} />
        </Pressable>
      ) : null}
    </Animated.View>
  );
}

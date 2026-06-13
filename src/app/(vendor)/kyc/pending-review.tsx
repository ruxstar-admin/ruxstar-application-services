/**
 * KYC — Pending Review screen
 * Shown after all 3 steps are submitted, while an admin is reviewing.
 */
import { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, StatusBar, Pressable,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuthStore } from '@/stores/auth-store';
import { useKycStore, nextKycStep } from '@/stores/kyc-store';
import { Brand, Radius, Spacing } from '@/constants/theme';

export default function PendingReviewScreen() {
  const insets      = useSafeAreaInsets();
  const token       = useAuthStore((s) => s.token);
  const fetchStatus = useKycStore((s) => s.fetchStatus);
  const kycStatus   = useKycStore((s) => s.status);

  const [checking, setChecking] = useState(false);

  async function checkStatus() {
    if (!token) return;
    setChecking(true);
    try {
      const status = await fetchStatus(token);
      const step   = nextKycStep(status);
      if (step === 'verified') router.replace('/(vendor)/');
      if (step === 'rejected') router.replace('/(vendor)/kyc/rejected');
    } finally {
      setChecking(false);
    }
  }

  // Auto-check once on mount
  useEffect(() => { checkStatus(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <View style={[s.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <StatusBar barStyle="dark-content" backgroundColor={Brand.bg} />

      <View style={s.card}>
        {/* Animated icon area */}
        <View style={s.iconRing}>
          <Text style={s.icon}>⏳</Text>
        </View>

        <Text style={s.title}>Under review</Text>
        <Text style={s.sub}>
          Your KYC documents have been submitted. Our team typically reviews submissions within
          24 hours. You'll receive a notification once approved.
        </Text>

        {/* Step summary */}
        <View style={s.stepsBox}>
          <StepRow emoji="🪪" label="Aadhaar" status={kycStatus?.aadhaar.status} />
          <StepRow emoji="📋" label="PAN"     status={kycStatus?.pan.status} />
          <StepRow emoji="🤳" label="Selfie"  status={kycStatus?.face.status} />
        </View>

        <Pressable
          style={[s.btn, checking && s.btnDisabled]}
          onPress={checkStatus}
          disabled={checking}
        >
          {checking ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={s.btnText}>Check status</Text>
          )}
        </Pressable>

        <Text style={s.footnote}>
          Come back later or tap "Check status" to refresh.
        </Text>
      </View>
    </View>
  );
}

function StepRow({ emoji, label, status }: { emoji: string; label: string; status?: string }) {
  const isVerified = status === 'verified';
  const isFailed   = status === 'failed';
  const color = isVerified ? Brand.success : isFailed ? Brand.error : Brand.creamMuted;
  const mark  = isVerified ? '✓' : isFailed ? '✗' : '…';

  return (
    <View style={sr.row}>
      <Text style={sr.emoji}>{emoji}</Text>
      <Text style={sr.label}>{label}</Text>
      <Text style={[sr.mark, { color }]}>{mark}</Text>
    </View>
  );
}

const sr = StyleSheet.create({
  row:   { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  emoji: { fontSize: 16 },
  label: { flex: 1, color: Brand.creamSub, fontSize: 14 },
  mark:  { fontSize: 15, fontWeight: '700' },
});

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Brand.bg, alignItems: 'center', justifyContent: 'center', padding: Spacing.four },

  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: Brand.surface1,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Brand.border1,
    padding: Spacing.five,
    alignItems: 'center',
    gap: Spacing.three,
  },

  iconRing: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(217,119,6,0.10)',
    borderWidth: 1, borderColor: 'rgba(217,119,6,0.25)',
    alignItems: 'center', justifyContent: 'center',
  },
  icon: { fontSize: 36 },

  title: { color: Brand.cream,    fontSize: 22, fontWeight: '800', textAlign: 'center', letterSpacing: -0.3 },
  sub:   { color: Brand.creamSub, fontSize: 14, textAlign: 'center', lineHeight: 22 },

  stepsBox: {
    width: '100%',
    backgroundColor: Brand.bg,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Brand.border1,
    padding: Spacing.three,
    gap: Spacing.two,
  },

  btn: {
    width: '100%',
    backgroundColor: Brand.primary,
    borderRadius: Radius.pill,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },

  footnote: { color: Brand.creamMuted, fontSize: 12, textAlign: 'center' },
});

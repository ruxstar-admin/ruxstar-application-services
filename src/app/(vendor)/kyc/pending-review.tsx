/**
 * KYC -- Pending Review screen
 * Shown after all 3 steps are submitted, while an admin is reviewing.
 * Auto-polls every 15s (same as web) and flips to dashboard when approved.
 */
import { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, StatusBar, Pressable,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useAuthStore } from '@/stores/auth-store';
import { useKycStore, nextKycStep } from '@/stores/kyc-store';
import { Brand, Radius, Spacing } from '@/constants/theme';

export default function PendingReviewScreen() {
  const insets      = useSafeAreaInsets();
  const token       = useAuthStore((s) => s.token);
  const fetchStatus = useKycStore((s) => s.fetchStatus);
  const kycStatus   = useKycStore((s) => s.status);

  const [checking, setChecking] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function checkStatus(silent = false) {
    if (!token) return;
    if (!silent) setChecking(true);
    try {
      const status = await fetchStatus(token);
      const step   = nextKycStep(status);
      if (step === 'verified') { router.replace('/(vendor)/'); return; }
      if (step === 'rejected') { router.replace('/(vendor)/kyc/rejected'); return; }
    } finally {
      if (!silent) setChecking(false);
    }
  }

  // Check once on mount, then every 15s silently (same as web)
  useEffect(() => {
    checkStatus();
    intervalRef.current = setInterval(() => checkStatus(true), 15000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <View style={[s.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <StatusBar barStyle="dark-content" backgroundColor={Brand.bg} />

      <View style={s.card}>
        {/* Icon */}
        <View style={s.iconRing}>
          <Ionicons name="hourglass-outline" size={36} color={Brand.warning} />
        </View>

        <Text style={s.title}>Under Review</Text>
        <Text style={s.sub}>
          Your documents have been submitted. Our team typically reviews within
          24 hours. We'll notify you once approved.
        </Text>

        {/* Step summary */}
        <View style={s.stepsBox}>
          <StepRow icon="finger-print-outline" label="Aadhaar" status={kycStatus?.aadhaar.status} />
          <StepRow icon="card-outline"         label="PAN"     status={kycStatus?.pan.status} />
          <StepRow icon="camera-outline"       label="Selfie"  status={kycStatus?.face.status} />
        </View>

        {/* Auto-poll note */}
        <View style={s.autoNote}>
          <Ionicons name="sync-outline" size={13} color={Brand.primary} />
          <Text style={s.autoNoteText}>Checking automatically every 15 seconds</Text>
        </View>

        <Pressable
          style={[s.btn, checking && s.btnDisabled]}
          onPress={() => checkStatus()}
          disabled={checking}
        >
          {checking ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <>
              <Ionicons name="refresh-outline" size={16} color="#fff" />
              <Text style={s.btnText}>Check now</Text>
            </>
          )}
        </Pressable>

        <Pressable style={s.backLink} onPress={() => router.replace('/(vendor)/')}>
          <Ionicons name="arrow-back" size={14} color={Brand.primary} />
          <Text style={s.backLinkText}>Back to Dashboard</Text>
        </Pressable>
      </View>
    </View>
  );
}

function StepRow({ icon, label, status }: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  status?: string;
}) {
  const isVerified = status === 'verified';
  const isFailed   = status === 'failed';
  const color = isVerified ? Brand.success : isFailed ? Brand.error : Brand.creamMuted;
  const checkIcon = isVerified
    ? 'checkmark-circle'
    : isFailed
      ? 'close-circle'
      : 'ellipse-outline';

  return (
    <View style={sr.row}>
      <View style={sr.iconWrap}>
        <Ionicons name={icon} size={15} color={Brand.creamSub} />
      </View>
      <Text style={sr.label}>{label}</Text>
      <Ionicons name={checkIcon} size={16} color={color} />
    </View>
  );
}

const sr = StyleSheet.create({
  row:     { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  iconWrap: {
    width: 28, height: 28, borderRadius: Radius.sm,
    backgroundColor: Brand.surface2,
    alignItems: 'center', justifyContent: 'center',
  },
  label:   { flex: 1, color: Brand.creamSub, fontSize: 14 },
});

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Brand.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
  },

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
    backgroundColor: 'rgba(217,119,6,0.08)',
    borderWidth: 1, borderColor: 'rgba(217,119,6,0.20)',
    alignItems: 'center', justifyContent: 'center',
  },

  title: { color: Brand.cream, fontSize: 22, fontWeight: '800', textAlign: 'center', letterSpacing: -0.3 },
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

  autoNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  autoNoteText: { color: Brand.creamSub, fontSize: 12 },

  btn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Brand.primary,
    borderRadius: Radius.pill,
    paddingVertical: 15,
    marginTop: Spacing.one,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },

  backLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  backLinkText: { color: Brand.primary, fontSize: 13, fontWeight: '600' },
});

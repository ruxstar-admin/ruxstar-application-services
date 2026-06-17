/**
 * KYC — Rejected screen
 * Shown when admin rejects the KYC submission. Offers retry.
 */
import {
  View, Text, StyleSheet, StatusBar, Pressable,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useKycStore } from '@/stores/kyc-store';
import { Brand, Radius, Spacing } from '@/constants/theme';

export default function RejectedScreen() {
  const insets    = useSafeAreaInsets();
  const kycStatus = useKycStore((s) => s.status);

  function handleRetry() {
    // Go back to the routing hub — it will pick the first failed step
    router.replace('/(vendor)/kyc');
  }

  return (
    <View style={[s.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <StatusBar barStyle="dark-content" backgroundColor={Brand.bg} />

      <View style={s.card}>
        <View style={s.iconRing}>
          <Text style={s.icon}>❌</Text>
        </View>

        <Text style={s.title}>Verification rejected</Text>
        <Text style={s.sub}>
          Unfortunately we couldn't verify your identity with the documents provided.
          {kycStatus?.message ? `\n\n${kycStatus.message}` : ''}
        </Text>

        {/* Step error details */}
        {(kycStatus?.aadhaar.status === 'failed' ||
          kycStatus?.pan.status === 'failed' ||
          kycStatus?.face.status === 'failed') && (
          <View style={s.detailBox}>
            <Text style={s.detailTitle}>What failed:</Text>
            {kycStatus?.aadhaar.status === 'failed' && (
              <FailRow label="Aadhaar" message={kycStatus.aadhaar.message} />
            )}
            {kycStatus?.pan.status === 'failed' && (
              <FailRow label="PAN" message={kycStatus.pan.message} />
            )}
            {kycStatus?.face.status === 'failed' && (
              <FailRow label="Selfie" message={kycStatus.face.message} />
            )}
          </View>
        )}

        <Pressable style={s.btn} onPress={handleRetry}>
          <Text style={s.btnText}>Retry verification</Text>
        </Pressable>

        <Text style={s.footnote}>
          Need help? Contact support@ruxstar.in
        </Text>
      </View>
    </View>
  );
}

function FailRow({ label, message }: { label: string; message?: string }) {
  return (
    <View style={fr.row}>
      <Text style={fr.label}>• {label}:</Text>
      <Text style={fr.msg}>{message ?? 'Verification failed.'}</Text>
    </View>
  );
}

const fr = StyleSheet.create({
  row:   { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  label: { color: Brand.error,    fontSize: 13, fontWeight: '600' },
  msg:   { color: Brand.creamSub, fontSize: 13, flex: 1 },
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
    backgroundColor: 'rgba(220,38,38,0.08)',
    borderWidth: 1, borderColor: 'rgba(220,38,38,0.20)',
    alignItems: 'center', justifyContent: 'center',
  },
  icon: { fontSize: 36 },

  title: { color: Brand.cream,  fontSize: 22, fontWeight: '800', textAlign: 'center', letterSpacing: -0.3 },
  sub:   { color: Brand.creamSub, fontSize: 14, textAlign: 'center', lineHeight: 22 },

  detailBox: {
    width: '100%',
    backgroundColor: 'rgba(220,38,38,0.05)',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: 'rgba(220,38,38,0.15)',
    padding: Spacing.three,
    gap: Spacing.two,
  },
  detailTitle: { color: Brand.error, fontSize: 12, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },

  btn: {
    width: '100%',
    backgroundColor: Brand.primary,
    borderRadius: Radius.pill,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  btnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },

  footnote: { color: Brand.creamMuted, fontSize: 12, textAlign: 'center' },
});

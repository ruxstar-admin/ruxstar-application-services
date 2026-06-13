/**
 * KYC Step 1 — Aadhaar via DigiLocker
 */
import { useState } from 'react';
import {
  View, Text, StyleSheet, StatusBar, Pressable,
  ActivityIndicator, ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import * as AuthSession from 'expo-auth-session';
import Constants from 'expo-constants';

import { useAuthStore } from '@/stores/auth-store';
import { useKycStore } from '@/stores/kyc-store';
import { KycService } from '@/services/kyc-service';
import { Brand, Radius, Spacing } from '@/constants/theme';

/**
 * Redirect URI strategy:
 *
 * DigiLocker requires HTTPS — it rejects bare custom-scheme URIs.
 *
 * • Dev / Expo Go  → useProxy:true  → https://auth.expo.io/@owner/slug
 *   The Expo proxy receives DigiLocker's redirect and relays it back to
 *   the app via the custom scheme deep link. No extra infrastructure needed.
 *
 * • EAS Preview / Production → same proxy URL still works because EAS
 *   builds embed the same slug and the proxy looks it up by slug.
 *   After DigiLocker completes, auth.expo.io deep-links back to:
 *     ruxstarapplicationservices://kyc/callback
 *   which maps to our callback.tsx screen.
 *
 * NOTE: If Expo ever retires the proxy you can swap this for an
 * HTTPS relay page on your own domain without touching anything else.
 */
const IS_DEV = Constants.appOwnership === 'expo' || __DEV__;

const REDIRECT_URI = AuthSession.makeRedirectUri({
  // useProxy was removed in expo-auth-session 6.x (SDK 52).
  // Use the native scheme redirect directly — EAS and dev both support it.
  scheme: 'ruxstarapplicationservices',
  path: 'kyc/callback',
});

export default function AadhaarScreen() {
  const insets    = useSafeAreaInsets();
  const token     = useAuthStore((s) => s.token);
  const kycStatus = useKycStore((s) => s.status);

  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  async function handleStart() {
    if (!token) return;
    setError('');
    setLoading(true);

    try {
      // Send the HTTPS proxy URI to backend — DigiLocker accepts it.
      // After DigiLocker completes, auth.expo.io relays back to this app via deep link.
      const { url } = await KycService.startAadhaar(token, REDIRECT_URI);

      // Pass REDIRECT_URI so openAuthSessionAsync knows when to close the browser
      const result = await WebBrowser.openAuthSessionAsync(url, REDIRECT_URI);

      if (result.type === 'success') {
        // Deep link received — callback screen will handle sync
        router.replace('/(vendor)/kyc/callback');
      }
      // If dismissed / cancel — do nothing, user stays on this screen
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start Aadhaar verification.');
    } finally {
      setLoading(false);
    }
  }

  const stepFailed = kycStatus?.aadhaar.status === 'failed';

  return (
    <ScrollView
      style={s.root}
      contentContainerStyle={[s.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32 }]}
      keyboardShouldPersistTaps="handled"
    >
      <StatusBar barStyle="dark-content" backgroundColor={Brand.bg} />

      {/* Progress dots */}
      <StepDots current={0} />

      {/* Icon */}
      <View style={s.iconWrap}>
        <Text style={s.icon}>🪪</Text>
      </View>

      <Text style={s.title}>Verify your Aadhaar</Text>
      <Text style={s.sub}>
        We use DigiLocker to securely verify your identity. You'll be redirected to the official
        DigiLocker portal — no Aadhaar number is stored by Ruxstar.
      </Text>

      {/* Info box */}
      <View style={s.infoBox}>
        <InfoRow emoji="🔐" text="Government-grade DigiLocker verification" />
        <InfoRow emoji="🚫" text="Aadhaar number never stored on our servers" />
        <InfoRow emoji="⚡" text="Takes under 60 seconds" />
      </View>

      {stepFailed && (
        <View style={s.errorBox}>
          <Text style={s.errorText}>
            {kycStatus?.aadhaar.message ?? 'Aadhaar verification failed. Please try again.'}
          </Text>
        </View>
      )}

      {error ? (
        <View style={s.errorBox}>
          <Text style={s.errorText}>{error}</Text>
        </View>
      ) : null}

      <Pressable
        style={[s.btn, loading && s.btnDisabled]}
        onPress={handleStart}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={s.btnText}>Continue with DigiLocker</Text>
        )}
      </Pressable>

      <Text style={s.footnote}>
        By continuing you agree to our Terms of Service and Privacy Policy.
      </Text>
    </ScrollView>
  );
}

function InfoRow({ emoji, text }: { emoji: string; text: string }) {
  return (
    <View style={s.infoRow}>
      <Text style={s.infoEmoji}>{emoji}</Text>
      <Text style={s.infoText}>{text}</Text>
    </View>
  );
}

function StepDots({ current }: { current: number }) {
  const labels = ['Aadhaar', 'PAN', 'Selfie'];
  return (
    <View style={s.dots}>
      {labels.map((label, i) => (
        <View key={label} style={s.dotWrap}>
          <View style={[s.dot, i === current && s.dotActive, i < current && s.dotDone]}>
            {i < current ? (
              <Text style={s.dotTick}>✓</Text>
            ) : (
              <Text style={[s.dotNum, i === current && s.dotNumActive]}>{i + 1}</Text>
            )}
          </View>
          <Text style={[s.dotLabel, i === current && s.dotLabelActive]}>{label}</Text>
          {i < labels.length - 1 && <View style={[s.dotLine, i < current && s.dotLineDone]} />}
        </View>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: Brand.bg },
  content: { paddingHorizontal: Spacing.four, gap: Spacing.three },

  // ── Step dots ──────────────────────────────────────────────────────────────
  dots: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'center', gap: 0, marginBottom: Spacing.two },
  dotWrap: { alignItems: 'center', flexDirection: 'row', gap: 6 },
  dot: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: Brand.surface2,
    borderWidth: 1, borderColor: Brand.border2,
    alignItems: 'center', justifyContent: 'center',
  },
  dotActive: { backgroundColor: Brand.primary, borderColor: Brand.primary },
  dotDone:   { backgroundColor: Brand.success,  borderColor: Brand.success },
  dotNum:    { fontSize: 12, fontWeight: '600', color: Brand.creamMuted },
  dotNumActive: { color: '#FFFFFF' },
  dotTick:   { fontSize: 11, color: '#FFFFFF', fontWeight: '700' },
  dotLabel:  { fontSize: 10, color: Brand.creamMuted, fontWeight: '500', marginLeft: -28, marginTop: 32, position: 'absolute', width: 48, textAlign: 'center', left: -10 },
  dotLabelActive: { color: Brand.primary, fontWeight: '700' },
  dotLine:   { width: 32, height: 1, backgroundColor: Brand.border2, marginHorizontal: 2 },
  dotLineDone: { backgroundColor: Brand.success },

  // ── Icon ───────────────────────────────────────────────────────────────────
  iconWrap: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: Brand.primaryGlow,
    borderWidth: 1, borderColor: 'rgba(124,58,237,0.20)',
    alignItems: 'center', justifyContent: 'center',
    alignSelf: 'center',
    marginTop: Spacing.four,
  },
  icon: { fontSize: 32 },

  // ── Text ───────────────────────────────────────────────────────────────────
  title: { color: Brand.cream,    fontSize: 24, fontWeight: '800', textAlign: 'center', letterSpacing: -0.4 },
  sub:   { color: Brand.creamSub, fontSize: 14, textAlign: 'center', lineHeight: 22 },

  // ── Info box ───────────────────────────────────────────────────────────────
  infoBox: {
    backgroundColor: Brand.surface1,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Brand.border1,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  infoRow:   { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  infoEmoji: { fontSize: 16 },
  infoText:  { color: Brand.creamSub, fontSize: 13, flex: 1 },

  // ── Error ──────────────────────────────────────────────────────────────────
  errorBox: {
    backgroundColor: 'rgba(220,38,38,0.06)',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: 'rgba(220,38,38,0.20)',
    padding: Spacing.three,
  },
  errorText: { color: Brand.error, fontSize: 13, lineHeight: 20 },

  // ── Button ─────────────────────────────────────────────────────────────────
  btn: {
    backgroundColor: Brand.primary,
    borderRadius: Radius.pill,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },

  footnote: { color: Brand.creamMuted, fontSize: 11, textAlign: 'center', lineHeight: 16 },
});

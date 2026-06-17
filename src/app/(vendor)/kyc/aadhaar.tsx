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

import * as Linking from 'expo-linking';

import { useAuthStore } from '@/stores/auth-store';
import { useKycStore } from '@/stores/kyc-store';
import { KycService } from '@/services/kyc-service';
import { Brand, Radius, Spacing } from '@/constants/theme';

/**
 * Redirect URI strategy — Expo Go compatible
 *
 * Problem: DigiLocker requires HTTPS. Custom schemes (ruxstarapplicationservices://)
 * are rejected by DigiLocker, and the Expo proxy (auth.expo.io) fails to deep-link
 * back into Expo Go because the custom scheme isn't registered there.
 *
 * Solution for Expo Go:
 *  1. We still send an HTTPS redirect URL to DigiLocker (required).
 *     We use the backend's own URL — it's always HTTPS and a valid URL.
 *  2. After DigiLocker redirects the browser (to any URL), we treat the browser
 *     closing as the trigger — both 'success' AND 'dismiss' navigate to the
 *     callback screen which calls /vendor/kyc/aadhaar/sync.
 *  3. We also show a "I've completed DigiLocker" button so the user can
 *     manually trigger the sync if the browser doesn't auto-close.
 *
 * Production (development build with real deep links):
 *  Replace REDIRECT_URI with your own HTTPS domain + a real deep-link relay page.
 */
/**
 * Build the redirect URL that the backend will send the user's browser to
 * after DigiLocker authentication completes.
 *
 * We point to https://ruxstar.com/kyc/mobile-done and attach the app's live
 * callback URL as an `appUri` query param.
 *
 * Linking.createURL('kyc/callback') returns the correct URL for the current
 * runtime environment:
 *   • Expo Go  → exp://192.168.x.x:8081/--/kyc/callback   ← registered in Expo Go ✅
 *   • Standalone → ruxstarapplicationservices://kyc/callback ✅
 *
 * The web page reads `appUri` and uses it for the auto-redirect, so the user
 * is brought back to the exact right place in any environment.
 */
function buildRedirectUri(token: string): string {
  const appCallbackUrl = Linking.createURL('kyc/callback');
  return (
    `https://ruxstar.com/kyc/mobile-done` +
    `?appUri=${encodeURIComponent(appCallbackUrl)}` +
    `&token=${encodeURIComponent(token)}`
  );
}

export default function AadhaarScreen() {
  const insets    = useSafeAreaInsets();
  const token     = useAuthStore((s) => s.token);
  const kycStatus = useKycStore((s) => s.status);

  const [loading,       setLoading]       = useState(false);
  const [browserOpened, setBrowserOpened] = useState(false);
  const [error,         setError]         = useState('');

  async function handleStart() {
    if (!token) return;
    setError('');
    setLoading(true);

    try {
      // Build at call-time so Linking.createURL() resolves the live Expo Go
      // server address (which isn't known until the app is running).
      const redirectUri = buildRedirectUri(token);
      const { url } = await KycService.startAadhaar(token, redirectUri);

      setLoading(false);
      setBrowserOpened(true);

      // openBrowserAsync opens a browser and resolves when the user closes it.
      // We don't rely on a deep-link redirect — Expo Go doesn't support custom
      // scheme redirects from external browsers (scheme not registered in Expo Go).
      await WebBrowser.openBrowserAsync(url, {
        showTitle:          true,
        enableBarCollapsing: false,
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
      });

      // Browser closed — user may have completed DigiLocker or dismissed it.
      // Navigate to callback screen which calls sync and routes accordingly.
      // If DigiLocker wasn't completed, sync will still show 'aadhaar' as next
      // step and we'll be sent back here with an appropriate error message.
      router.replace('/(vendor)/kyc/callback');

    } catch (err) {
      setLoading(false);
      setError(err instanceof Error ? err.message : 'Could not start Aadhaar verification.');
    }
  }

  // Manual fallback: user closed the browser themselves before we detected it.
  function handleManualContinue() {
    router.replace('/(vendor)/kyc/callback');
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

      {/* Expo Go hint — shown after browser opens */}
      {browserOpened && (
        <View style={s.hintBox}>
          <Text style={s.hintTitle}>Completed DigiLocker?</Text>
          <Text style={s.hintText}>
            After finishing DigiLocker, close the browser and tap the button below to continue.
          </Text>
          <Pressable style={s.hintBtn} onPress={handleManualContinue}>
            <Text style={s.hintBtnText}>I've completed DigiLocker →</Text>
          </Pressable>
        </View>
      )}

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
        style={[s.btn, (loading || browserOpened) && s.btnDisabled]}
        onPress={handleStart}
        disabled={loading || browserOpened}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={s.btnText}>
            {browserOpened ? 'DigiLocker opened…' : 'Continue with DigiLocker'}
          </Text>
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

  // ── Expo Go hint box ───────────────────────────────────────────────────────
  hintBox: {
    backgroundColor: 'rgba(22,163,74,0.06)',
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(22,163,74,0.25)',
    padding: Spacing.three,
    gap: Spacing.two,
  },
  hintTitle: { color: Brand.success, fontSize: 14, fontWeight: '700' },
  hintText:  { color: Brand.creamSub, fontSize: 13, lineHeight: 20 },
  hintBtn: {
    backgroundColor: Brand.success,
    borderRadius: Radius.pill,
    paddingVertical: 10,
    paddingHorizontal: Spacing.three,
    alignSelf: 'flex-start',
  },
  hintBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },

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
  btnDisabled: { opacity: 0.5 },
  btnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },

  footnote: { color: Brand.creamMuted, fontSize: 11, textAlign: 'center', lineHeight: 16 },
});

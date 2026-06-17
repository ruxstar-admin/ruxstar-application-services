/**
 * KYC Step 2 — PAN card verification
 */
import { useState } from 'react';
import {
  View, Text, StyleSheet, StatusBar, Pressable,
  ActivityIndicator, ScrollView, TextInput,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuthStore } from '@/stores/auth-store';
import { useKycStore, nextKycStep } from '@/stores/kyc-store';
import { KycService } from '@/services/kyc-service';
import { Brand, Radius, Spacing } from '@/constants/theme';

const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;

export default function PanScreen() {
  const insets      = useSafeAreaInsets();
  const token       = useAuthStore((s) => s.token);
  const fetchStatus = useKycStore((s) => s.fetchStatus);
  const kycStatus   = useKycStore((s) => s.status);

  const [pan,     setPan]     = useState('');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [focused, setFocused] = useState(false);

  const panFormatted = pan.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
  const panValid     = PAN_REGEX.test(panFormatted);

  async function handleSubmit() {
    if (!token || !panValid) return;
    setError('');
    setLoading(true);

    try {
      await KycService.submitPan(token, panFormatted);

      // Refresh status and route
      const status = await fetchStatus(token);
      const step   = nextKycStep(status);

      switch (step) {
        case 'face':            router.replace('/(vendor)/kyc/face');           break;
        case 'pending_review':  router.replace('/(vendor)/kyc/pending-review'); break;
        case 'verified':        router.replace('/(vendor)/');                   break;
        case 'rejected':        router.replace('/(vendor)/kyc/rejected');       break;
        default:                router.replace('/(vendor)/kyc/pan');            break;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'PAN verification failed. Try again.');
    } finally {
      setLoading(false);
    }
  }

  const stepFailed = kycStatus?.pan.status === 'failed';

  return (
    <ScrollView
      style={s.root}
      contentContainerStyle={[s.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32 }]}
      keyboardShouldPersistTaps="handled"
    >
      <StatusBar barStyle="dark-content" backgroundColor={Brand.bg} />

      <StepDots current={1} />

      <View style={s.iconWrap}>
        <Text style={s.icon}>🪪</Text>
      </View>

      <Text style={s.title}>Enter your PAN</Text>
      <Text style={s.sub}>
        Your Permanent Account Number links your Aadhaar identity to your tax record. We verify it
        with the government registry — it won't be visible to customers.
      </Text>

      {/* PAN input */}
      <View style={[s.inputWrap, focused && s.inputWrapFocused, panFormatted.length === 10 && panValid && s.inputWrapValid]}>
        <TextInput
          style={s.input}
          value={panFormatted}
          onChangeText={(v) => setPan(v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10))}
          placeholder="ABCDE1234F"
          placeholderTextColor={Brand.creamMuted}
          autoCapitalize="characters"
          autoCorrect={false}
          keyboardType="default"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          editable={!loading}
          maxLength={10}
        />
        {panFormatted.length === 10 && (
          <Text style={panValid ? s.checkGreen : s.checkRed}>{panValid ? '✓' : '✗'}</Text>
        )}
      </View>

      <Text style={s.hint}>Format: 5 letters · 4 digits · 1 letter (e.g. ABCDE1234F)</Text>

      {stepFailed && !error && (
        <View style={s.errorBox}>
          <Text style={s.errorText}>
            {kycStatus?.pan.message ?? 'PAN verification failed. Please re-enter your PAN.'}
          </Text>
        </View>
      )}

      {error ? (
        <View style={s.errorBox}>
          <Text style={s.errorText}>{error}</Text>
        </View>
      ) : null}

      <Pressable
        style={[s.btn, (!panValid || loading) && s.btnDisabled]}
        onPress={handleSubmit}
        disabled={!panValid || loading}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={s.btnText}>Verify PAN</Text>
        )}
      </Pressable>
    </ScrollView>
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
          {i < labels.length - 1 && <View style={[s.dotLine, i < current && s.dotLineDone]} />}
        </View>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: Brand.bg },
  content: { paddingHorizontal: Spacing.four, gap: Spacing.three },

  dots: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 0, marginBottom: Spacing.two },
  dotWrap: { alignItems: 'center', flexDirection: 'row', gap: 6 },
  dot: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: Brand.surface2, borderWidth: 1, borderColor: Brand.border2,
    alignItems: 'center', justifyContent: 'center',
  },
  dotActive: { backgroundColor: Brand.primary, borderColor: Brand.primary },
  dotDone:   { backgroundColor: Brand.success,  borderColor: Brand.success },
  dotNum:    { fontSize: 12, fontWeight: '600', color: Brand.creamMuted },
  dotNumActive: { color: '#FFFFFF' },
  dotTick:   { fontSize: 11, color: '#FFFFFF', fontWeight: '700' },
  dotLine:   { width: 32, height: 1, backgroundColor: Brand.border2 },
  dotLineDone: { backgroundColor: Brand.success },

  iconWrap: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: Brand.primaryGlow,
    borderWidth: 1, borderColor: 'rgba(124,58,237,0.20)',
    alignItems: 'center', justifyContent: 'center',
    alignSelf: 'center',
    marginTop: Spacing.four,
  },
  icon: { fontSize: 32 },

  title: { color: Brand.cream,    fontSize: 24, fontWeight: '800', textAlign: 'center', letterSpacing: -0.4 },
  sub:   { color: Brand.creamSub, fontSize: 14, textAlign: 'center', lineHeight: 22 },

  // ── Input ──────────────────────────────────────────────────────────────────
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Brand.surface1,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Brand.border2,
    paddingHorizontal: Spacing.three,
    height: 52,
  },
  inputWrapFocused: { borderColor: Brand.primary, backgroundColor: Brand.bg },
  inputWrapValid:   { borderColor: Brand.success },
  input: {
    flex: 1,
    color: Brand.cream,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 2,
  },
  checkGreen: { fontSize: 18, color: Brand.success, fontWeight: '700' },
  checkRed:   { fontSize: 18, color: Brand.error,   fontWeight: '700' },

  hint: { color: Brand.creamMuted, fontSize: 12, marginTop: -Spacing.two },

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
});

/**
 * KYC DigiLocker callback -- post-browser return
 *
 * The web /kyc/mobile-done page attempts to sync Aadhaar before showing
 * "Continue to Ruxstar". But Cashfree can take 30-60s for its two-stage
 * processing (AUTHENTICATED + document fetch). If the web page timed out,
 * we pick up here and keep retrying.
 *
 * Cashfree backend sync has two stages:
 *   Stage 1: GET /digilocker?verification_id=...  -> status must be AUTHENTICATED
 *   Stage 2: GET /digilocker/document/AADHAAR?... -> status must be SUCCESS
 * Both are async -- total processing can exceed 45s in slow cases.
 */

import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withTiming, Easing,
} from 'react-native-reanimated';
import { router } from 'expo-router';
import { useAuthStore } from '@/stores/auth-store';
import { useKycStore } from '@/stores/kyc-store';
import { KycService, nextKycStep } from '@/services/kyc-service';
import { Brand, Radius, Spacing } from '@/constants/theme';

const MAX_ATTEMPTS     = 30;
const POLL_INTERVAL_MS = 4000;
const INITIAL_DELAY_MS = 2000;
// Total expected duration in ms — used to drive the progress bar
const TOTAL_DURATION_MS = INITIAL_DELAY_MS + MAX_ATTEMPTS * POLL_INTERVAL_MS; // ~122s

// User-friendly stage messages — shown based on elapsed time, not attempt count
const STAGE_MESSAGES = [
  { after: 0,   msg: 'Connecting to DigiLocker…' },
  { after: 5000, msg: 'Authenticating your identity…' },
  { after: 20000, msg: 'Fetching your Aadhaar document…' },
  { after: 45000, msg: 'Almost there, finalising verification…' },
  { after: 75000, msg: 'This is taking a little longer than usual…' },
];

export default function KycCallbackScreen() {
  const token       = useAuthStore((s) => s.token);
  const fetchStatus = useKycStore((s) => s.fetchStatus);
  const calledRef   = useRef(false);
  const startRef    = useRef<number>(Date.now());

  const [error,       setError]       = useState('');
  const [stageIndex,  setStageIndex]  = useState(0);

  // Animated progress bar value 0 → 1
  const progress = useSharedValue(0);
  const barStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%` as any,
  }));

  // Smoothly advance the progress bar over the full expected duration
  useEffect(() => {
    progress.value = withTiming(0.95, {
      duration: TOTAL_DURATION_MS,
      easing: Easing.out(Easing.quad),
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Update stage message based on elapsed wall-clock time
  useEffect(() => {
    const timers = STAGE_MESSAGES.slice(1).map((stage, i) =>
      setTimeout(() => setStageIndex(i + 1), stage.after),
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  // Sync + poll loop
  useEffect(() => {
    if (!token || calledRef.current) return;
    calledRef.current = true;

    (async () => {
      try {
        await new Promise<void>((r) => setTimeout(r, INITIAL_DELAY_MS));

        for (let i = 1; i <= MAX_ATTEMPTS; i++) {
          await KycService.syncAadhaar(token).catch(() => null);
          const status = await fetchStatus(token);
          const step   = nextKycStep(status);

          if (step !== 'aadhaar') {
            // Snap bar to 100% before navigating
            progress.value = withTiming(1, { duration: 400 });
            await new Promise<void>((r) => setTimeout(r, 420));
            switch (step) {
              case 'pan':            router.replace('/(vendor)/kyc/pan');            return;
              case 'face':           router.replace('/(vendor)/kyc/face');           return;
              case 'pending_review': router.replace('/(vendor)/kyc/pending-review'); return;
              case 'verified':       router.replace('/(vendor)/');                   return;
              case 'rejected':       router.replace('/(vendor)/kyc/rejected');       return;
            }
          }

          if (i < MAX_ATTEMPTS) {
            await new Promise<void>((r) => setTimeout(r, POLL_INTERVAL_MS));
          }
        }

        setError('Aadhaar verification is taking longer than expected. Please try again.');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong.');
      }
    })();
  }, [token, fetchStatus]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Error state ───────────────────────────────────────────────────────────
  if (error) {
    return (
      <View style={s.root}>
        <View style={s.card}>
          <View style={s.errorIcon}>
            <Text style={s.errorEmoji}>⚠</Text>
          </View>
          <Text style={s.title}>Verification delayed</Text>
          <Text style={s.sub}>{error}</Text>
          <Pressable
            style={s.retryBtn}
            onPress={() => router.replace('/(vendor)/kyc/aadhaar')}
          >
            <Text style={s.retryText}>Try again</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // ── Loading state ─────────────────────────────────────────────────────────
  return (
    <View style={s.root}>
      <View style={s.card}>
        {/* Fingerprint icon */}
        <View style={s.iconWrap}>
          <Text style={s.iconEmoji}>🪪</Text>
        </View>

        <Text style={s.title}>Verifying your Aadhaar</Text>
        <Text style={s.sub}>{STAGE_MESSAGES[stageIndex].msg}</Text>

        {/* Progress bar */}
        <View style={s.barTrack}>
          <Animated.View style={[s.barFill, barStyle]} />
        </View>

        <Text style={s.note}>Please keep the app open</Text>
      </View>
    </View>
  );
}

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
    maxWidth: 360,
    backgroundColor: Brand.surface1,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Brand.border1,
    padding: Spacing.five,
    alignItems: 'center',
    gap: Spacing.three,
  },

  iconWrap: {
    width: 72, height: 72,
    borderRadius: 36,
    backgroundColor: Brand.primaryGlow,
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.20)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconEmoji: { fontSize: 32 },

  title: {
    color: Brand.cream,
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  sub: {
    color: Brand.creamSub,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    minHeight: 44,
  },

  // Progress bar
  barTrack: {
    width: '100%',
    height: 4,
    borderRadius: 4,
    backgroundColor: Brand.surface2,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: Brand.primary,
  },

  note: {
    color: Brand.creamMuted,
    fontSize: 12,
    textAlign: 'center',
  },

  // Error
  errorIcon: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: 'rgba(220,38,38,0.08)',
    borderWidth: 1, borderColor: 'rgba(220,38,38,0.20)',
    alignItems: 'center', justifyContent: 'center',
  },
  errorEmoji: { fontSize: 32 },
  retryBtn: {
    backgroundColor: Brand.primary,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.five,
    paddingVertical: 14,
    marginTop: Spacing.one,
  },
  retryText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});

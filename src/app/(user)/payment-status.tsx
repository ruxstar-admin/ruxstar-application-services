/**
 * Payment Status Screen
 * Route: /(user)/payment-status?bookingId=<id>&kind=booking|event
 *
 * Polls the booking or event registration until status = confirmed + paymentStatus = paid
 * (or until 20 attempts / 40 seconds).
 *
 * States:
 *   loading   → spinning while polling
 *   success   → green checkmark
 *   failed    → red ×
 *   timeout   → warning (could not verify in time)
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Brand, Radius, Spacing } from '@/constants/theme';
import { useAuthStore } from '@/stores/auth-store';
import { API_URL } from '@/constants/config';

const MAX_ATTEMPTS = 20;
const POLL_MS      = 2000;

type ScreenState = 'loading' | 'success' | 'failed' | 'timeout';

async function fetchBookingStatus(bookingId: string, kind: string, token: string): Promise<'confirmed' | 'pending' | 'failed'> {
  const endpoint = kind === 'event'
    ? `user/event-registrations/${encodeURIComponent(bookingId)}`
    : `user/bookings/${encodeURIComponent(bookingId)}`;

  const res = await fetch(`${API_URL}/${endpoint}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return 'pending';

  const data = await res.json().catch(() => ({})) as Record<string, unknown>;
  const record = (data.booking ?? data.registration ?? data) as Record<string, unknown>;
  const status        = typeof record.status        === 'string' ? record.status        : '';
  const paymentStatus = typeof record.paymentStatus === 'string' ? record.paymentStatus : '';

  if (status === 'confirmed' && paymentStatus === 'paid') return 'confirmed';
  if (status === 'cancelled' || status === 'expired')     return 'failed';
  return 'pending';
}

export default function PaymentStatusScreen() {
  const { bookingId = '', kind = 'booking' } = useLocalSearchParams<{ bookingId: string; kind: string }>();
  const token = useAuthStore((s) => s.token);

  const [state,    setState]    = useState<ScreenState>('loading');
  const [attempts, setAttempts] = useState(0);
  const timerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);

  const poll = useCallback(async () => {
    if (!token || !bookingId) { setState('failed'); return; }

    setAttempts((n) => {
      if (n >= MAX_ATTEMPTS) { setState('timeout'); return n; }
      return n + 1;
    });

    try {
      const result = await fetchBookingStatus(bookingId, kind, token);
      if (result === 'confirmed') {
        setState('success');
      } else if (result === 'failed') {
        setState('failed');
      } else {
        // Still pending — schedule next poll
        timerRef.current = setTimeout(poll, POLL_MS);
      }
    } catch {
      timerRef.current = setTimeout(poll, POLL_MS);
    }
  }, [token, bookingId, kind]);

  useEffect(() => {
    poll();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [poll]);

  // ── Derived display ──────────────────────────────────────────────────────────

  const config: Record<ScreenState, { emoji: string; title: string; sub: string; color: string }> = {
    loading: {
      emoji: '',
      title: 'Verifying payment…',
      sub:   'Please wait while we confirm your payment.',
      color: Brand.primary,
    },
    success: {
      emoji: '✅',
      title: 'Payment confirmed!',
      sub:   `Your ${kind === 'event' ? 'registration' : 'booking'} is now confirmed. See you there!`,
      color: Brand.success,
    },
    failed: {
      emoji: '❌',
      title: 'Payment failed',
      sub:   `We could not confirm your ${kind === 'event' ? 'registration' : 'booking'}. Please try again or contact support.`,
      color: Brand.error,
    },
    timeout: {
      emoji: '⚠️',
      title: 'Could not verify',
      sub:   'Your payment may still be processing. Check My Bookings in a few minutes.',
      color: Brand.warning,
    },
  };

  const { emoji, title, sub, color } = config[state];

  return (
    <SafeAreaView style={s.screen} edges={['top', 'bottom']}>
      <View style={s.container}>

        {/* Icon / Spinner */}
        <View style={[s.iconWrap, { borderColor: `${color}30`, backgroundColor: `${color}10` }]}>
          {state === 'loading' ? (
            <ActivityIndicator size="large" color={color} />
          ) : (
            <Text style={s.emoji}>{emoji}</Text>
          )}
        </View>

        <Text style={[s.title, { color }]}>{title}</Text>
        <Text style={s.sub}>{sub}</Text>

        {state === 'loading' && (
          <Text style={s.attempt}>Attempt {attempts} of {MAX_ATTEMPTS}</Text>
        )}

        {/* Actions */}
        <View style={s.actions}>
          {(state === 'success' || state === 'failed' || state === 'timeout') && (
            <Pressable
              style={[s.btn, { backgroundColor: color }]}
              onPress={() => router.replace('/(user)/orders' as never)}
            >
              <Ionicons name="calendar-outline" size={16} color="#fff" />
              <Text style={s.btnText}>View My Bookings</Text>
            </Pressable>
          )}

          <Pressable
            style={s.secondaryBtn}
            onPress={() => router.replace('/(user)/index' as never)}
          >
            <Text style={s.secondaryBtnText}>Go to Home</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen:     { flex: 1, backgroundColor: Brand.bg },
  container:  { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.four, gap: Spacing.three },

  iconWrap:   { width: 96, height: 96, borderRadius: 48, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.two },
  emoji:      { fontSize: 44 },

  title:      { fontSize: 22, fontWeight: '800', textAlign: 'center', letterSpacing: -0.3 },
  sub:        { fontSize: 14, color: Brand.creamSub, textAlign: 'center', lineHeight: 20 },
  attempt:    { fontSize: 12, color: Brand.creamMuted },

  actions:       { width: '100%', gap: Spacing.two, marginTop: Spacing.two },
  btn:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: Radius.lg, paddingVertical: 14 },
  btnText:       { color: '#fff', fontWeight: '700', fontSize: 14 },
  secondaryBtn:  { alignItems: 'center', paddingVertical: 14, borderRadius: Radius.lg, borderWidth: 1, borderColor: Brand.border1, backgroundColor: Brand.surface1 },
  secondaryBtnText: { color: Brand.creamSub, fontWeight: '600', fontSize: 14 },
});

/**
 * OTP Screen — Signup verify & Login verify
 * mode='login'  → loginVerifyOtp  → setAuth → home
 * mode='signup' → signupVerifyOtp → setPendingSignupToken → details
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, Pressable,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import Animated, {
  FadeInDown,
  useAnimatedStyle, useSharedValue,
  withSpring, withSequence,
} from 'react-native-reanimated';

import AuthVideoBackdrop from '@/components/auth/AuthVideoBackdrop';
import AuthGlassCard from '@/components/auth/AuthGlassCard';
import OtpInput from '@/components/auth/OtpInput';
import PrimaryButton from '@/components/ui/PrimaryButton';
import { Radius, Spacing } from '@/constants/theme';
import { useAuthStore, setPendingLoginRoute } from '@/stores/auth-store';
import { useKycStore } from '@/stores/kyc-store';
import { useBusinessStore } from '@/stores/business-store';
import { useUserStore } from '@/stores/user-store';
import { AuthService, resolveRole } from '@/services/auth-service';
import { KycService, nextKycStep } from '@/services/kyc-service';

const OTP_TIMER = 60;

export default function OtpScreen() {
  const params = useLocalSearchParams<{
    phone:  string;
    mode:   'login' | 'signup';
    devOtp: string;
  }>();

  const { setAuth, setPendingSignupToken, setLoading, isLoading } = useAuthStore();
  const resetKyc      = useKycStore((s) => s.reset);
  const resetBusiness = useBusinessStore((s) => s.reset);
  const clearProfile  = useUserStore((s) => s.clearProfile);

  const [otp,       setOtp]       = useState('');
  const [isError,   setIsError]   = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [apiError,  setApiError]  = useState('');
  const [timer,     setTimer]     = useState(OTP_TIMER);
  const [canResend, setCanResend] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const successScale = useSharedValue(1);
  const successStyle = useAnimatedStyle(() => ({
    transform: [{ scale: successScale.value }],
  }));

  const startTimer = useCallback(() => {
    setTimer(OTP_TIMER); setCanResend(false);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) { clearInterval(timerRef.current!); setCanResend(true); return 0; }
        return prev - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => {
    startTimer();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  useEffect(() => {
    if (otp.length === 6) handleVerify(otp);
  }, [otp]);

  // ── Verify OTP ────────────────────────────────────────────────────────────
  const handleVerify = async (code: string) => {
    if (code.length < 6) return;
    setLoading(true); setIsError(false); setApiError('');
    try {
      if (params.mode === 'login') {
        const res  = await AuthService.loginVerifyOtp(params.phone ?? '', code);
        const role = resolveRole(res.user);
        setIsSuccess(true);
        successScale.value = withSequence(
          withSpring(1.06, { damping: 4, stiffness: 200 }),
          withSpring(1,    { damping: 8, stiffness: 150 }),
        );
        // Wipe all stores from any previous session before setting new auth
        resetKyc();
        resetBusiness();
        clearProfile();

        // Determine destination while success animation plays (500 ms)
        let destination = role === 'vendor' ? '/(vendor)' : '/(user)';
        if (role === 'vendor') {
          const [, kycResult] = await Promise.allSettled([
            new Promise((r) => setTimeout(r, 500)),
            KycService.getStatus(res.token),
          ]);
          if (kycResult.status === 'fulfilled') {
            const step = nextKycStep(kycResult.value);
            if (step === 'aadhaar' || step === 'pan' || step === 'face' || step === 'rejected') {
              destination = '/(vendor)/kyc';
            }
          }
        } else {
          await new Promise((r) => setTimeout(r, 500));
        }

        // Tell AuthGuard where to land, then commit auth (single navigation, no flash)
        setPendingLoginRoute(destination);
        setAuth({
          token:  res.token,
          userId: res.user._id ?? res.user.id ?? '',
          role,
          phone:  params.phone ?? '',
          name:   res.user.name,
        });
      } else {
        // signup
        const res = await AuthService.signupVerifyOtp(params.phone ?? '', code);
        setIsSuccess(true);
        successScale.value = withSequence(
          withSpring(1.06, { damping: 4, stiffness: 200 }),
          withSpring(1,    { damping: 8, stiffness: 150 }),
        );
        setPendingSignupToken(res.signupToken);
        await new Promise((r) => setTimeout(r, 500));
        router.push('/(auth)/register/details');
      }
    } catch (e: any) {
      setIsError(true); setIsSuccess(false);
      setApiError(e.message ?? 'Incorrect code. Please try again.');
      setTimeout(() => { setIsError(false); setOtp(''); setApiError(''); }, 1200);
    } finally {
      setLoading(false);
    }
  };

  // ── Resend ────────────────────────────────────────────────────────────────
  const handleResend = async () => {
    if (!canResend) return;
    setOtp(''); setIsError(false); setApiError('');
    try {
      if (params.mode === 'login') {
        await AuthService.loginSendOtp(params.phone ?? '');
      } else {
        await AuthService.signupSendOtp(params.phone ?? '');
      }
      startTimer();
    } catch (e: any) {
      setApiError(e.message ?? 'Failed to resend');
    }
  };

  const maskedPhone = params.phone
    ? params.phone.slice(0, -4).replace(/\d/g, '*') + params.phone.slice(-4)
    : 'your number';

  const formatTimer = (s: number) => `0:${s.toString().padStart(2, '0')}`;

  return (
    <AuthVideoBackdrop onBack={() => router.back()}>
      <KeyboardAvoidingView
        behavior="padding"
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : -100}
        style={s.flex}>
        <ScrollView
          contentContainerStyle={s.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>

          {/* Hero — directly on the video */}
          <Animated.View entering={FadeInDown.delay(80).duration(500)} style={s.hero}>
            <Text style={s.title}>
              {isSuccess ? 'Verified.' : 'Enter the\ncode.'}
            </Text>
            <Text style={s.subtitle}>
              Sent to <Text style={s.phoneHighlight}>{maskedPhone}</Text>
            </Text>
          </Animated.View>

          {/* Glass card — OTP entry */}
          <AuthGlassCard delay={180}>
            <Animated.View style={successStyle}>
              <OtpInput
                value={otp}
                onChange={setOtp}
                isError={isError}
                isSuccess={isSuccess}
                disabled={isSuccess || isLoading}
              />
            </Animated.View>
            {(isError || apiError) ? (
              <Text style={s.errorText}>
                {apiError || 'Incorrect code. Please try again.'}
              </Text>
            ) : null}

            <PrimaryButton
              variant="white"
              label={isSuccess ? 'Verified ✓' : 'Verify'}
              onPress={() => handleVerify(otp)}
              isLoading={isLoading}
              disabled={otp.length < 6 || isSuccess}
            />

            <View style={s.resendSection}>
              {canResend ? (
                <Pressable onPress={handleResend} hitSlop={8}>
                  <Text style={s.resendActive}>Resend code</Text>
                </Pressable>
              ) : (
                <Text style={s.resendTimer}>
                  Resend in <Text style={s.timerText}>{formatTimer(timer)}</Text>
                </Text>
              )}
            </View>

            {params.devOtp ? (
              <View style={s.devHint}>
                <Text style={s.devLabel}>DEV</Text>
                <Text style={s.devText}>
                  Code: <Text style={s.devCode}>{params.devOtp}</Text>
                </Text>
              </View>
            ) : null}
          </AuthGlassCard>

        </ScrollView>
      </KeyboardAvoidingView>
    </AuthVideoBackdrop>
  );
}

const s = StyleSheet.create({
  flex:    { flex: 1 },
  content: { flexGrow: 1, paddingBottom: Spacing.five },

  hero: { gap: Spacing.two, marginTop: Spacing.four, marginBottom: Spacing.three, paddingHorizontal: Spacing.three },
  title: {
    color: '#FFFFFF', fontSize: 36, fontWeight: '800',
    letterSpacing: -1, lineHeight: 42,
  },
  subtitle: { color: 'rgba(255,255,255,0.85)', fontSize: 15, lineHeight: 22 },
  phoneHighlight: { color: '#FFFFFF', fontWeight: '700' },

  errorText: { color: '#C0392B', fontSize: 13, fontWeight: '500' },

  resendSection: { alignItems: 'center' },
  resendTimer:   { color: 'rgba(10,10,15,0.6)', fontSize: 14 },
  timerText:     { color: '#0A0A0F', fontWeight: '700' },
  resendActive:  { color: '#0A0A0F', fontSize: 14, fontWeight: '700', textDecorationLine: 'underline' },

  devHint: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.two,
    alignSelf: 'center',
    paddingHorizontal: Spacing.three, paddingVertical: Spacing.two,
    borderRadius: Radius.md,
    backgroundColor: 'rgba(10,10,15,0.05)',
  },
  devLabel: {
    color: '#FFFFFF', fontSize: 10, fontWeight: '800',
    letterSpacing: 1, backgroundColor: '#0A0A0F',
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4,
  },
  devText: { color: 'rgba(10,10,15,0.7)', fontSize: 13 },
  devCode: { color: '#0A0A0F', fontWeight: '700', letterSpacing: 2 },
});

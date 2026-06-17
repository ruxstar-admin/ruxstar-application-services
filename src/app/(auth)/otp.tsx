/**
 * OTP Screen — Signup verify & Login verify
 * mode='login'  → loginVerifyOtp  → setAuth → home
 * mode='signup' → signupVerifyOtp → setPendingSignupToken → details
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, StatusBar, Pressable,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeInDown, FadeInUp,
  useAnimatedStyle, useSharedValue,
  withSpring, withSequence,
} from 'react-native-reanimated';

import OtpInput from '@/components/auth/OtpInput';
import PrimaryButton from '@/components/ui/PrimaryButton';
import { Brand, Radius, Spacing } from '@/constants/theme';
import { useAuthStore, setPendingLoginRoute } from '@/stores/auth-store';
import { useKycStore } from '@/stores/kyc-store';
import { useBusinessStore } from '@/stores/business-store';
import { useUserStore } from '@/stores/user-store';
import { AuthService, resolveRole } from '@/services/auth-service';
import { KycService, nextKycStep } from '@/services/kyc-service';

const OTP_TIMER = 60;

export default function OtpScreen() {
  const insets = useSafeAreaInsets();
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
    <View style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor={Brand.bg} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.flex}>
        <ScrollView
          contentContainerStyle={[
            s.content,
            { paddingTop: insets.top + Spacing.three, paddingBottom: insets.bottom + Spacing.five },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>

          {/* Back */}
          <Animated.View entering={FadeInDown.delay(50).duration(400)}>
            <Pressable onPress={() => router.back()} style={s.backBtn} hitSlop={12}>
              <Text style={s.backArrow}>←</Text>
            </Pressable>
          </Animated.View>

          {/* Title */}
          <Animated.View entering={FadeInDown.delay(180).duration(600)} style={s.titleSection}>
            <Text style={s.title}>
              {isSuccess ? 'Verified.' : 'Enter the\ncode.'}
            </Text>
            <Text style={s.subtitle}>
              Sent to <Text style={s.phoneHighlight}>{maskedPhone}</Text>
            </Text>
          </Animated.View>

          {/* OTP cells */}
          <Animated.View
            entering={FadeInUp.delay(320).duration(500)}
            style={[s.otpSection, successStyle]}>
            <OtpInput
              value={otp}
              onChange={setOtp}
              isError={isError}
              isSuccess={isSuccess}
              disabled={isSuccess || isLoading}
            />
            {(isError || apiError) ? (
              <Animated.Text entering={FadeInDown.duration(250)} style={s.errorText}>
                {apiError || 'Incorrect code. Please try again.'}
              </Animated.Text>
            ) : null}
          </Animated.View>

          {/* Verify button */}
          <Animated.View entering={FadeInUp.delay(420).duration(500)}>
            <PrimaryButton
              label={isSuccess ? 'Verified ✓' : 'Verify'}
              onPress={() => handleVerify(otp)}
              isLoading={isLoading}
              disabled={otp.length < 6 || isSuccess}
              variant={isSuccess ? 'outline' : 'primary'}
            />
          </Animated.View>

          {/* Resend */}
          <Animated.View entering={FadeInUp.delay(500).duration(500)} style={s.resendSection}>
            {canResend ? (
              <Pressable onPress={handleResend} hitSlop={8}>
                <Text style={s.resendActive}>Resend code</Text>
              </Pressable>
            ) : (
              <Text style={s.resendTimer}>
                Resend in <Text style={s.timerText}>{formatTimer(timer)}</Text>
              </Text>
            )}
          </Animated.View>

          {/* Dev OTP hint */}
          {params.devOtp ? (
            <Animated.View entering={FadeInUp.delay(600).duration(400)} style={s.devHint}>
              <Text style={s.devLabel}>DEV</Text>
              <Text style={s.devText}>
                Code: <Text style={s.devCode}>{params.devOtp}</Text>
              </Text>
            </Animated.View>
          ) : null}

        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: Brand.bg },
  flex:    { flex: 1 },
  content: { paddingHorizontal: Spacing.four, gap: Spacing.five },

  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Brand.surface1,
    borderWidth: 1, borderColor: Brand.border1,
    alignItems: 'center', justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  backArrow: { color: Brand.cream, fontSize: 18, fontWeight: '600' },

  titleSection: { gap: Spacing.two },
  title: {
    color: Brand.cream, fontSize: 44, fontWeight: '800',
    letterSpacing: -1.5, lineHeight: 50,
  },
  subtitle: { color: Brand.creamSub, fontSize: 16, lineHeight: 24 },
  phoneHighlight: { color: Brand.primaryLight, fontWeight: '700' },

  otpSection: { gap: Spacing.two },
  errorText: { color: Brand.error, fontSize: 13, fontWeight: '500', marginTop: 4 },

  resendSection: { alignItems: 'center' },
  resendTimer:   { color: Brand.creamSub, fontSize: 14 },
  timerText:     { color: Brand.cream, fontWeight: '700' },
  resendActive:  { color: Brand.primaryLight, fontSize: 14, fontWeight: '700' },

  devHint: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.two,
    alignSelf: 'center',
    paddingHorizontal: Spacing.three, paddingVertical: Spacing.two,
    borderRadius: Radius.md,
    backgroundColor: Brand.surface1,
    borderWidth: 1, borderColor: Brand.border2,
  },
  devLabel: {
    color: Brand.primaryLight, fontSize: 10, fontWeight: '800',
    letterSpacing: 1, backgroundColor: Brand.primaryGlow,
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4,
  },
  devText: { color: Brand.creamSub, fontSize: 13 },
  devCode: { color: Brand.primaryXLight, fontWeight: '700', letterSpacing: 2 },
});

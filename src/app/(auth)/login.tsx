/**
 * Login Screen — robot speaks based on form state (mirrors web frontend)
 */

import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, StatusBar,
  KeyboardAvoidingView, Platform, Pressable,
  TouchableWithoutFeedback, Keyboard, ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

import PhoneInput from '@/components/auth/PhoneInput';
import { LoginRobot } from '@/components/auth/LoginRobot';
import InputField from '@/components/ui/InputField';
import PrimaryButton from '@/components/ui/PrimaryButton';
import { Brand, Radius, Spacing } from '@/constants/theme';
import { useAuthStore, setPendingLoginRoute } from '@/stores/auth-store';
import { useKycStore } from '@/stores/kyc-store';
import { useBusinessStore } from '@/stores/business-store';
import { useUserStore } from '@/stores/user-store';
import { AuthService, resolveRole } from '@/services/auth-service';
import { KycService, nextKycStep } from '@/services/kyc-service';

type Mode = 'password' | 'otp';

function isValidPhone(digits: string) {
  return digits.replace(/\D/g, '').length >= 7;
}

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { setAuth, setLoading, isLoading, setPendingPhone } = useAuthStore();
  const resetKyc = useKycStore((s) => s.reset);
  const resetBusiness  = useBusinessStore((s) => s.reset);
  const clearProfile   = useUserStore((s) => s.clearProfile);

  const [mode,       setMode]       = useState<Mode>('password');
  const [phone,      setPhone]      = useState('');
  const [fullNumber, setFullNumber] = useState('');
  const [password,   setPassword]   = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [passError,  setPassError]  = useState('');
  const [error,      setError]      = useState('');
  const [shake,      setShake]      = useState(false);   // ← robot shake

  const phoneValid = isValidPhone(phone) && phone.length <= 10;

  // Trigger robot shake + show error (mirrors web "fail" function)
  function fail(msg: string) {
    setError(msg);
    setShake(true);
    setTimeout(() => setShake(false), 500);
  }

  const handlePhoneChange = useCallback((text: string, full: string) => {
    setPhone(text);
    setFullNumber(full);
    setPhoneError('');
    if (text.length > 10) {
      setError("Hmm, that's too many digits — double-check your number!");
    } else {
      setError('');
    }
  }, []);

  const handlePasswordLogin = async () => {
    let valid = true;
    if (!phoneValid)         { setPhoneError('Enter a valid mobile number'); valid = false; }
    if (password.length < 6) { setPassError('Password must be at least 6 characters'); valid = false; }
    if (!valid) { fail(phoneError || passError); return; }

    setLoading(true); setError('');
    try {
      const res  = await AuthService.loginPassword(fullNumber, password);
      const role = resolveRole(res.user);

      // Wipe all stores from any previous session
      resetKyc();
      resetBusiness();
      clearProfile();

      // Determine destination BEFORE setAuth so AuthGuard does one clean navigation
      let destination = role === 'vendor' ? '/(vendor)' : '/(user)';
      if (role === 'vendor') {
        try {
          const kyc  = await KycService.getStatus(res.token);
          const step = nextKycStep(kyc);
          if (step === 'aadhaar' || step === 'pan' || step === 'face' || step === 'rejected') {
            destination = '/(vendor)/kyc';
          }
        } catch { /* fail open — go to dashboard */ }
      }

      // Tell AuthGuard where to land, then commit auth (triggers single navigation)
      setPendingLoginRoute(destination);
      setAuth({
        token:  res.token,
        userId: res.user._id ?? res.user.id ?? '',
        role,
        phone:  fullNumber,
        name:   res.user.name,
      });
    } catch (e: any) {
      fail(e.message ?? 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async () => {
    if (!phoneValid) { fail('Enter a valid mobile number'); return; }
    setLoading(true); setError('');
    try {
      const res = await AuthService.loginSendOtp(fullNumber);
      setPendingPhone(fullNumber);
      router.push({
        pathname: '/(auth)/otp',
        params: { phone: fullNumber, mode: 'login', devOtp: res.otp ?? '' },
      });
    } catch (e: any) {
      fail(e.message ?? 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (m: Mode) => {
    setMode(m);
    setError('');
    setPhoneError('');
    setPassError('');
  };

  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor={Brand.bg} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.flex}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
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

            {/* Robot — speaks based on mode / loading / error */}
            <Animated.View entering={FadeInDown.delay(100).duration(600)}>
              <LoginRobot
                mode={mode}
                otpStep={0}
                loading={isLoading}
                shake={shake}
                error={error}
                size="sm"
              />
            </Animated.View>

            {/* Mode toggle */}
            <Animated.View entering={FadeInDown.delay(280).duration(500)} style={s.toggle}>
              {(['password', 'otp'] as Mode[]).map((m) => (
                <Pressable
                  key={m}
                  onPress={() => switchMode(m)}
                  style={[s.toggleTab, mode === m && s.toggleTabActive]}>
                  <Text style={[s.toggleLabel, mode === m && s.toggleLabelActive]}>
                    {m === 'password' ? 'Password' : 'OTP'}
                  </Text>
                </Pressable>
              ))}
            </Animated.View>

            {/* Form */}
            <Animated.View entering={FadeInUp.delay(360).duration(500)} style={s.form}>
              <View>
                <Text style={s.fieldLabel}>Mobile Number</Text>
                <PhoneInput
                  value={phone}
                  onChangeText={handlePhoneChange}
                  error={phoneError}
                  placeholder="Enter your number"
                />
              </View>
              {mode === 'password' && (
                <InputField
                  label="Password"
                  value={password}
                  onChangeText={(t) => { setPassword(t); setPassError(''); setError(''); }}
                  error={passError}
                  placeholder="Your password"
                  isPassword
                  textContentType="password"
                />
              )}
            </Animated.View>

            {/* CTA */}
            <Animated.View entering={FadeInUp.delay(440).duration(500)}>
              <PrimaryButton
                variant="white"
                label={mode === 'password' ? 'Sign In' : 'Send OTP →'}
                onPress={mode === 'password' ? handlePasswordLogin : handleSendOtp}
                isLoading={isLoading}
                disabled={!phoneValid || (mode === 'password' && password.length < 1)}
              />
            </Animated.View>

            {/* Sign up link */}
            <Animated.View entering={FadeInUp.delay(520).duration(400)} style={s.signupRow}>
              <Text style={s.signupText}>New to Ruxstar? </Text>
              <Pressable onPress={() => router.push('/(auth)/register')} hitSlop={8}>
                <Text style={s.signupLink}>Create account →</Text>
              </Pressable>
            </Animated.View>

          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: Brand.bg },
  flex:    { flex: 1 },
  content: { paddingHorizontal: Spacing.four, gap: Spacing.three },

  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Brand.surface1,
    borderWidth: 1, borderColor: Brand.border1,
    alignItems: 'center', justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  backArrow: { color: Brand.cream, fontSize: 18, fontWeight: '600' },

  toggle: {
    flexDirection: 'row',
    backgroundColor: Brand.surface1,
    borderRadius: Radius.pill,
    borderWidth: 1, borderColor: Brand.border1,
    padding: 4,
  },
  toggleTab: {
    flex: 1, paddingVertical: 10, borderRadius: Radius.pill,
    alignItems: 'center', justifyContent: 'center',
  },
  toggleTabActive: {
    backgroundColor: 'rgba(0,0,0,0.06)',
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.14)',
  },
  toggleLabel:       { color: Brand.creamMuted, fontSize: 14, fontWeight: '600' },
  toggleLabelActive: { color: Brand.cream,      fontSize: 14, fontWeight: '700' },

  form: { gap: Spacing.three },
  fieldLabel: {
    color: Brand.creamSub, fontSize: 12, fontWeight: '600',
    letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 6,
  },

  signupRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  signupText: { color: Brand.creamSub, fontSize: 14 },
  signupLink: { color: Brand.cream, fontSize: 14, fontWeight: '700' },
});

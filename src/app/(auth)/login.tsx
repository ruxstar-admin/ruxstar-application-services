/**
 * Login Screen
 */

import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet,
  KeyboardAvoidingView, Platform, Pressable,
  TouchableWithoutFeedback, Keyboard, ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';

import AuthVideoBackdrop from '@/components/auth/AuthVideoBackdrop';
import AuthGlassCard from '@/components/auth/AuthGlassCard';
import PhoneInput from '@/components/auth/PhoneInput';
import InputField from '@/components/ui/InputField';
import PrimaryButton from '@/components/ui/PrimaryButton';
import { Radius, Spacing } from '@/constants/theme';
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

  const phoneValid = isValidPhone(phone) && phone.length <= 10;

  function fail(msg: string) {
    setError(msg);
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
    <AuthVideoBackdrop onBack={() => router.back()}>
      <KeyboardAvoidingView
        behavior="padding"
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : -100}
        style={s.flex}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            contentContainerStyle={s.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>

            {/* Hero — directly on the video */}
            <Animated.View entering={FadeInDown.delay(80).duration(500)} style={s.hero}>
              <Text style={s.title}>Sign in to Ruxstar</Text>
              <Text style={s.subtitle}>Welcome back — enter your details to continue.</Text>
            </Animated.View>

            {/* Glass card — form */}
            <AuthGlassCard delay={200}>
              <View style={s.toggle}>
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
              </View>

              <View>
                <Text style={s.fieldLabel}>Mobile Number</Text>
                <PhoneInput
                  value={phone}
                  onChangeText={handlePhoneChange}
                  error={phoneError}
                  placeholder="Phone number"
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
              {error ? <Text style={s.errorText}>{error}</Text> : null}

              <PrimaryButton
                variant="white"
                label={mode === 'password' ? 'Sign In' : 'Send OTP →'}
                onPress={mode === 'password' ? handlePasswordLogin : handleSendOtp}
                isLoading={isLoading}
                disabled={!phoneValid || (mode === 'password' && password.length < 1)}
              />

              <View style={s.signupRow}>
                <Text style={s.signupText}>New to Ruxstar? </Text>
                <Pressable onPress={() => router.push('/(auth)/register')} hitSlop={8}>
                  <Text style={s.signupLink}>Create account →</Text>
                </Pressable>
              </View>
            </AuthGlassCard>

          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </AuthVideoBackdrop>
  );
}

const s = StyleSheet.create({
  flex:    { flex: 1 },
  content: { flexGrow: 1, paddingBottom: Spacing.five },

  hero: { gap: 6, marginTop: Spacing.four, marginBottom: Spacing.three, paddingHorizontal: Spacing.three },
  title:    { color: '#FFFFFF', fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  subtitle: { color: 'rgba(255,255,255,0.85)', fontSize: 14, lineHeight: 20 },

  toggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(10,10,15,0.06)',
    borderRadius: Radius.pill,
    padding: 4,
  },
  toggleTab: {
    flex: 1, paddingVertical: 10, borderRadius: Radius.pill,
    alignItems: 'center', justifyContent: 'center',
  },
  toggleTabActive: {
    backgroundColor: '#0A0A0F',
  },
  toggleLabel:       { color: 'rgba(10,10,15,0.55)', fontSize: 14, fontWeight: '600' },
  toggleLabelActive: { color: '#FFFFFF',              fontSize: 14, fontWeight: '700' },

  fieldLabel: {
    color: 'rgba(10,10,15,0.55)', fontSize: 12, fontWeight: '600',
    letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 6,
  },
  errorText: { color: '#C0392B', fontSize: 13, fontWeight: '500' },

  signupRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  signupText: { color: 'rgba(10,10,15,0.6)', fontSize: 14 },
  signupLink: { color: '#0A0A0F', fontSize: 14, fontWeight: '700' },
});

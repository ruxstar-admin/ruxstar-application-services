/**
 * Register — Phone Entry (Step 1 of 3)
 */

import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView,
  Pressable, TouchableWithoutFeedback, Keyboard,
} from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';

import AuthVideoBackdrop from '@/components/auth/AuthVideoBackdrop';
import AuthGlassCard from '@/components/auth/AuthGlassCard';
import PhoneInput from '@/components/auth/PhoneInput';
import PrimaryButton from '@/components/ui/PrimaryButton';
import { Spacing } from '@/constants/theme';
import { useAuthStore } from '@/stores/auth-store';
import { AuthService } from '@/services/auth-service';

function isValidPhone(p: string) { return p.replace(/\D/g, '').length >= 7; }

export default function RegisterPhoneScreen() {
  const { setPendingPhone, setLoading, isLoading } = useAuthStore();

  const [phone,      setPhone]      = useState('');
  const [fullNumber, setFullNumber] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [error,      setError]      = useState('');
  const [agreed,     setAgreed]     = useState(false);

  function fail(msg: string) {
    setError(msg);
  }

  const canProceed = isValidPhone(phone) && phone.length <= 10 && agreed;

  const handleContinue = async () => {
    if (!isValidPhone(phone)) { fail('Enter a valid mobile number'); return; }
    if (!agreed) { fail('Please agree to the terms first'); return; }
    setLoading(true); setError('');
    try {
      const res = await AuthService.signupSendOtp(fullNumber);
      setPendingPhone(fullNumber);
      router.push({
        pathname: '/(auth)/otp',
        params: { phone: fullNumber, mode: 'signup', devOtp: res.otp ?? '' },
      });
    } catch (e: any) {
      fail(e.message ?? 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
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

            {/* Step dots + hero — directly on the video */}
            <Animated.View entering={FadeInDown.delay(60).duration(400)} style={s.stepRow}>
              {[0, 1, 2].map((i) => (
                <View key={i} style={[s.stepDot, i === 0 && s.stepDotActive]} />
              ))}
            </Animated.View>
            <Animated.View entering={FadeInDown.delay(140).duration(500)} style={s.hero}>
              <Text style={s.title}>Create your account</Text>
              <Text style={s.subtitle}>We'll text you a code to verify it's you.</Text>
            </Animated.View>

            {/* Glass card — form */}
            <AuthGlassCard delay={220}>
              <View>
                <Text style={s.fieldLabel}>Mobile Number</Text>
                <PhoneInput
                  value={phone}
                  onChangeText={(t, f) => {
                    setPhone(t); setFullNumber(f); setPhoneError('');
                    setError(t.length > 10 ? "Hmm, that's too many digits — double-check your number!" : '');
                  }}
                  error={phoneError}
                  placeholder="Phone number"
                />
              </View>

              <Pressable
                onPress={() => setAgreed((v) => !v)}
                style={s.termsRow}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: agreed }}>
                <View style={[s.checkbox, agreed && s.checkboxOn]}>
                  {agreed && <Text style={s.checkTick}>✓</Text>}
                </View>
                <Text style={s.termsText}>
                  I agree to Ruxstar's{' '}
                  <Text style={s.termsLink}>Terms of Service</Text>
                  {' '}and{' '}
                  <Text style={s.termsLink}>Privacy Policy</Text>
                </Text>
              </Pressable>
              {error ? <Text style={s.errorText}>{error}</Text> : null}

              <PrimaryButton
                variant="white"
                label="Send Verification Code →"
                onPress={handleContinue}
                isLoading={isLoading}
                disabled={!canProceed}
              />

              <View style={s.loginRow}>
                <Text style={s.loginText}>Already have an account? </Text>
                <Pressable onPress={() => router.push('/(auth)/login')} hitSlop={8}>
                  <Text style={s.loginLink}>Sign in</Text>
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

  stepRow: { flexDirection: 'row', gap: 6, alignItems: 'center', marginTop: Spacing.four, paddingHorizontal: Spacing.three },
  stepDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.3)' },
  stepDotActive: { backgroundColor: '#FFFFFF', width: 22, borderRadius: 4 },

  hero: { gap: 6, marginTop: Spacing.three, marginBottom: Spacing.three, paddingHorizontal: Spacing.three },
  title:    { color: '#FFFFFF', fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  subtitle: { color: 'rgba(255,255,255,0.85)', fontSize: 14, lineHeight: 20 },

  fieldLabel: {
    color: 'rgba(10,10,15,0.55)', fontSize: 12, fontWeight: '600',
    letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 6,
  },
  errorText: { color: '#C0392B', fontSize: 13, fontWeight: '500' },

  termsRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two },
  checkbox: {
    width: 22, height: 22, borderRadius: 6,
    borderWidth: 1.5, borderColor: 'rgba(10,10,15,0.25)',
    backgroundColor: 'rgba(10,10,15,0.03)',
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0, marginTop: 2,
  },
  checkboxOn: {
    borderColor: '#0A0A0F',
    backgroundColor: '#0A0A0F',
  },
  checkTick:  { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  termsText:  { color: 'rgba(10,10,15,0.65)', fontSize: 13, lineHeight: 20, flex: 1 },
  termsLink:  { color: '#0A0A0F', fontWeight: '600' },

  loginRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  loginText: { color: 'rgba(10,10,15,0.6)', fontSize: 14 },
  loginLink: { color: '#0A0A0F', fontSize: 14, fontWeight: '700' },
});

/**
 * Register — Phone Entry (Step 1 of 3)
 * Robot says: "Hey! Drop your mobile and I'll send a magic code!"
 * Left arm waves · Phone in right hand · Error = frown + shake
 */

import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, StatusBar,
  KeyboardAvoidingView, Platform, ScrollView,
  Pressable, TouchableWithoutFeedback, Keyboard,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

import PhoneInput from '@/components/auth/PhoneInput';
import { SignupRobot } from '@/components/auth/SignupRobot';
import PrimaryButton from '@/components/ui/PrimaryButton';
import { Brand, Radius, Spacing } from '@/constants/theme';
import { useAuthStore } from '@/stores/auth-store';
import { AuthService } from '@/services/auth-service';

function isValidPhone(p: string) { return p.replace(/\D/g, '').length >= 7; }

export default function RegisterPhoneScreen() {
  const insets = useSafeAreaInsets();
  const { setPendingPhone, setLoading, isLoading } = useAuthStore();

  const [phone,      setPhone]      = useState('');
  const [fullNumber, setFullNumber] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [error,      setError]      = useState('');
  const [shake,      setShake]      = useState(false);
  const [agreed,     setAgreed]     = useState(false);

  function fail(msg: string) {
    setError(msg);
    setShake(true);
    setTimeout(() => setShake(false), 500);
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

            {/* Header */}
            <Animated.View entering={FadeInDown.delay(50).duration(400)} style={s.header}>
              <Pressable onPress={() => router.back()} style={s.backBtn} hitSlop={12}>
                <Text style={s.backArrow}>←</Text>
              </Pressable>
              <View style={s.stepRow}>
                {[0, 1, 2].map((i) => (
                  <View key={i} style={[s.stepDot, i === 0 && s.stepDotActive]} />
                ))}
              </View>
              <View style={{ width: 40 }} />
            </Animated.View>

            {/* Robot — step 0: arm waves + phone with "SMS" */}
            <Animated.View entering={FadeInDown.delay(120).duration(600)}>
              <SignupRobot
                step={0}
                role="customer"
                loading={isLoading}
                shake={shake}
                error={error}
                size="sm"
              />
            </Animated.View>

            {/* Input */}
            <Animated.View entering={FadeInUp.delay(360).duration(500)} style={s.inputSection}>
              <Text style={s.fieldLabel}>Mobile Number</Text>
              <PhoneInput
                value={phone}
                onChangeText={(t, f) => {
                  setPhone(t); setFullNumber(f); setPhoneError('');
                  setError(t.length > 10 ? "Hmm, that's too many digits — double-check your number!" : '');
                }}
                error={phoneError}
                placeholder="Enter your number"
              />
            </Animated.View>

            {/* Terms */}
            <Animated.View entering={FadeInUp.delay(420).duration(500)}>
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
            </Animated.View>

            {/* CTA */}
            <Animated.View entering={FadeInUp.delay(500).duration(500)}>
              <PrimaryButton
                variant="white"
                label="Send Verification Code →"
                onPress={handleContinue}
                isLoading={isLoading}
                disabled={!canProceed}
              />
            </Animated.View>

            {/* Log in link */}
            <Animated.View entering={FadeInUp.delay(580).duration(400)} style={s.loginRow}>
              <Text style={s.loginText}>Already have an account? </Text>
              <Pressable onPress={() => router.push('/(auth)/login')} hitSlop={8}>
                <Text style={s.loginLink}>Sign in</Text>
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

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Brand.surface1,
    borderWidth: 1, borderColor: Brand.border1,
    alignItems: 'center', justifyContent: 'center',
  },
  backArrow: { color: Brand.cream, fontSize: 18, fontWeight: '600' },

  stepRow: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  stepDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Brand.border2 },
  stepDotActive: { backgroundColor: Brand.cream, width: 22, borderRadius: 4 },

  inputSection: { gap: Spacing.one },
  fieldLabel: {
    color: Brand.creamSub, fontSize: 12, fontWeight: '600',
    letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 6,
  },

  termsRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two },
  checkbox: {
    width: 22, height: 22, borderRadius: 6,
    borderWidth: 1.5, borderColor: Brand.border2,
    backgroundColor: Brand.surface1,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0, marginTop: 2,
  },
  checkboxOn: {
    borderColor: 'rgba(0,0,0,0.40)',
    backgroundColor: 'rgba(0,0,0,0.07)',
  },
  checkTick:  { color: Brand.cream, fontSize: 13, fontWeight: '800' },
  termsText:  { color: Brand.creamSub, fontSize: 13, lineHeight: 20, flex: 1 },
  termsLink:  { color: Brand.cream, fontWeight: '600' },

  loginRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  loginText: { color: Brand.creamSub, fontSize: 14 },
  loginLink: { color: Brand.cream, fontSize: 14, fontWeight: '700' },
});

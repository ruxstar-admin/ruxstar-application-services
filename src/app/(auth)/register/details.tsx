/**
 * Register — Profile Details (final step)
 */

import React, { useState } from 'react';
import {
  View, Text, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView,
  Pressable, TouchableWithoutFeedback, Keyboard,
} from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';

import AuthVideoBackdrop from '@/components/auth/AuthVideoBackdrop';
import AuthGlassCard from '@/components/auth/AuthGlassCard';
import InputField from '@/components/ui/InputField';
import PrimaryButton from '@/components/ui/PrimaryButton';
import { Radius, Spacing } from '@/constants/theme';
import type { UserRole } from '@/stores/auth-store';
import { useAuthStore, setPendingLoginRoute } from '@/stores/auth-store';
import { AuthService, resolveRole } from '@/services/auth-service';

const ROLES: { value: UserRole; label: string; icon: string; desc: string }[] = [
  { value: 'customer', label: 'Customer', icon: '🛍️', desc: 'Shop from local vendors' },
  { value: 'vendor',   label: 'Vendor',   icon: '🏪', desc: 'Sell your products' },
];

export default function RegisterDetailsScreen() {
  const { setAuth, clearPending, pendingPhone, pendingSignupToken, setLoading, isLoading } = useAuthStore();

  const [name,      setName]      = useState('');
  const [role,      setRole]      = useState<UserRole>('customer');
  const [password,  setPassword]  = useState('');
  const [nameError, setNameError] = useState('');
  const [passError, setPassError] = useState('');
  const [error,     setError]     = useState('');

  function fail(msg: string) {
    setError(msg);
  }

  const canProceed = name.trim().length >= 2 && password.length >= 6;

  const handleComplete = async () => {
    let valid = true;
    if (name.trim().length < 2) { setNameError('Enter your full name'); valid = false; }
    if (password.length < 6)    { setPassError('Password must be at least 6 characters'); valid = false; }
    if (!valid) { fail(nameError || passError); return; }

    if (!pendingSignupToken) { fail('Session expired. Please start over.'); return; }

    setLoading(true); setError('');
    try {
      const res      = await AuthService.signupComplete(pendingSignupToken, name.trim(), password, role);
      const resolved = resolveRole(res.user);
      clearPending();
      // Vendors go straight to KYC — no steps done yet on fresh signup
      // Users go to their home. AuthGuard reads the pending route and does
      // a single navigation once setAuth() triggers re-render.
      setPendingLoginRoute(resolved === 'vendor' ? '/(vendor)/kyc' : '/(user)');
      setAuth({
        token:  res.token,
        userId: res.user._id ?? res.user.id ?? '',
        role:   resolved,
        phone:  pendingPhone ?? '',
        name:   res.user.name ?? name.trim(),
      });
    } catch (e: any) {
      fail(e.message ?? 'Signup failed. Please try again.');
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
                <View key={i} style={[s.stepDot, i <= 2 && s.stepDotActive]} />
              ))}
            </Animated.View>
            <Animated.View entering={FadeInDown.delay(140).duration(500)} style={s.hero}>
              <Text style={s.title}>Almost there</Text>
              <Text style={s.subtitle}>Set your name, password, and how you'll use Ruxstar.</Text>
            </Animated.View>

            {/* Glass card — form */}
            <AuthGlassCard delay={220}>
              <InputField
                label="Full Name"
                required
                value={name}
                onChangeText={(t) => { setName(t); setNameError(''); setError(''); }}
                error={nameError}
                placeholder="Your full name"
                autoCapitalize="words"
                textContentType="name"
              />
              <InputField
                label="Password"
                required
                value={password}
                onChangeText={(t) => { setPassword(t); setPassError(''); setError(''); }}
                error={passError}
                placeholder="Create a password"
                isPassword
                textContentType="newPassword"
                helper="Minimum 6 characters"
              />

              <View style={s.roleSection}>
                <Text style={s.sectionLabel}>I am a</Text>
                <View style={s.roleCards}>
                  {ROLES.map((r) => (
                    <Pressable
                      key={r.value}
                      onPress={() => { setRole(r.value); setError(''); }}
                      style={[s.roleCard, role === r.value && s.roleCardActive]}>
                      <Text style={s.roleIcon}>{r.icon}</Text>
                      <Text style={[s.roleLabel, role === r.value && s.roleLabelActive]}>
                        {r.label}
                      </Text>
                      <Text style={s.roleDesc} numberOfLines={1}>{r.desc}</Text>
                      {role === r.value && (
                        <View style={s.roleCheck}>
                          <Text style={s.roleCheckMark}>✓</Text>
                        </View>
                      )}
                    </Pressable>
                  ))}
                </View>
                {error ? <Text style={s.errorText}>{error}</Text> : null}
              </View>

              <PrimaryButton
                variant="white"
                label="Create Account →"
                onPress={handleComplete}
                isLoading={isLoading}
                disabled={!canProceed}
              />
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

  errorText: { color: '#C0392B', fontSize: 13, fontWeight: '500', marginTop: 8 },

  roleSection: { gap: Spacing.two },
  sectionLabel: {
    color: 'rgba(10,10,15,0.55)', fontSize: 12, fontWeight: '600',
    letterSpacing: 0.8, textTransform: 'uppercase',
  },
  roleCards: { flexDirection: 'row', gap: Spacing.two },
  roleCard: {
    flex: 1,
    backgroundColor: 'rgba(10,10,15,0.03)',
    borderWidth: 1, borderColor: 'rgba(10,10,15,0.12)',
    borderRadius: Radius.lg,
    padding: Spacing.three,
    gap: 4,
    position: 'relative',
    alignItems: 'flex-start',
  },
  roleCardActive: {
    borderColor: '#0A0A0F',
    backgroundColor: 'rgba(10,10,15,0.06)',
  },
  roleIcon:        { fontSize: 22, marginBottom: 2 },
  roleLabel:       { color: 'rgba(10,10,15,0.6)', fontSize: 13, fontWeight: '700' },
  roleLabelActive: { color: '#0A0A0F' },
  roleDesc:        { color: 'rgba(10,10,15,0.45)', fontSize: 10, lineHeight: 14 },
  roleCheck: {
    position: 'absolute', top: 8, right: 8,
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: '#0A0A0F',
    alignItems: 'center', justifyContent: 'center',
  },
  roleCheckMark: { color: '#FFFFFF', fontSize: 10, fontWeight: '900' },
});

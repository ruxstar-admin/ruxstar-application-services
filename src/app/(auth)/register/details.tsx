/**
 * Register — Profile Details (Step 3 of 3)
 * Robot says: "Pick your superpower & a password. Then we launch!"
 * Role prop appears on robot body based on selected role.
 */

import React, { useState } from 'react';
import {
  View, Text, StyleSheet, StatusBar,
  KeyboardAvoidingView, Platform, ScrollView,
  Pressable, TouchableWithoutFeedback, Keyboard,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

import InputField from '@/components/ui/InputField';
import { SignupRobot } from '@/components/auth/SignupRobot';
import PrimaryButton from '@/components/ui/PrimaryButton';
import { Brand, Radius, Spacing } from '@/constants/theme';
import type { UserRole } from '@/stores/auth-store';
import { useAuthStore } from '@/stores/auth-store';
import { AuthService, resolveRole } from '@/services/auth-service';

const ROLES: { value: UserRole; label: string; icon: string; desc: string }[] = [
  { value: 'customer', label: 'Customer', icon: '🛍️', desc: 'Shop from local vendors' },
  { value: 'vendor',   label: 'Vendor',   icon: '🏪', desc: 'Sell your products' },
];

export default function RegisterDetailsScreen() {
  const insets = useSafeAreaInsets();
  const { setAuth, clearPending, pendingPhone, pendingSignupToken, setLoading, isLoading } = useAuthStore();

  const [name,      setName]      = useState('');
  const [role,      setRole]      = useState<UserRole>('customer');
  const [password,  setPassword]  = useState('');
  const [nameError, setNameError] = useState('');
  const [passError, setPassError] = useState('');
  const [error,     setError]     = useState('');
  const [shake,     setShake]     = useState(false);

  function fail(msg: string) {
    setError(msg);
    setShake(true);
    setTimeout(() => setShake(false), 500);
  }

  const canProceed = name.trim().length >= 2 && password.length >= 6;

  function goHome(r: UserRole) {
    if (r === 'vendor') { router.replace('/(vendor)'); return; }
    router.replace('/(user)');
  }

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
      setAuth({
        token:  res.token,
        userId: res.user._id ?? res.user.id ?? '',
        role:   resolved,
        phone:  pendingPhone ?? '',
        name:   res.user.name ?? name.trim(),
      });
      goHome(resolved);
    } catch (e: any) {
      fail(e.message ?? 'Signup failed. Please try again.');
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
                  <View key={i} style={[s.stepDot, i <= 2 && s.stepDotActive]} />
                ))}
              </View>
              <View style={{ width: 40 }} />
            </Animated.View>

            {/* Robot — step 2: shows role prop (bag / shop / scooter) */}
            <Animated.View entering={FadeInDown.delay(120).duration(600)}>
              <SignupRobot
                step={2}
                role={role}
                loading={isLoading}
                shake={shake}
                error={error}
                size="sm"
              />
            </Animated.View>

            {/* Name + Password */}
            <Animated.View entering={FadeInUp.delay(340).duration(500)} style={s.form}>
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
            </Animated.View>

            {/* Role picker — selection also changes robot prop */}
            <Animated.View entering={FadeInUp.delay(420).duration(500)} style={s.roleSection}>
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
            </Animated.View>

            {/* CTA */}
            <Animated.View entering={FadeInUp.delay(500).duration(500)}>
              <PrimaryButton
                variant="white"
                label="Create Account →"
                onPress={handleComplete}
                isLoading={isLoading}
                disabled={!canProceed}
              />
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

  form: { gap: Spacing.three },

  roleSection: { gap: Spacing.two },
  sectionLabel: {
    color: Brand.creamSub, fontSize: 12, fontWeight: '600',
    letterSpacing: 0.8, textTransform: 'uppercase',
  },
  roleCards: { flexDirection: 'row', gap: Spacing.two },
  roleCard: {
    flex: 1,
    backgroundColor: Brand.surface1,
    borderWidth: 1, borderColor: Brand.border1,
    borderRadius: Radius.lg,
    padding: Spacing.three,
    gap: 4,
    position: 'relative',
    alignItems: 'flex-start',
  },
  roleCardActive: {
    borderColor: Brand.primary,
    backgroundColor: Brand.primaryGlow,
  },
  roleIcon:        { fontSize: 22, marginBottom: 2 },
  roleLabel:       { color: Brand.creamSub, fontSize: 13, fontWeight: '700' },
  roleLabelActive: { color: Brand.cream },
  roleDesc:        { color: Brand.creamMuted, fontSize: 10, lineHeight: 14 },
  roleCheck: {
    position: 'absolute', top: 8, right: 8,
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: Brand.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  roleCheckMark: { color: '#FFFFFF', fontSize: 10, fontWeight: '900' },
});

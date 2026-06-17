/**
 * LoginForm — Organism
 *
 * Self-contained login form section:
 *   • Logo / title
 *   • PhoneInput molecule
 *   • "Continue with OTP" primary button
 *   • Divider + Google social login button
 *   • "New here?" link
 *
 * Emits callbacks upward; holds no navigation or store logic itself.
 */

import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import PhoneInput from '@/components/auth/PhoneInput';
import PrimaryButton from '@/components/ui/PrimaryButton';
import { Divider } from '@/components/atoms';
import { SocialLoginButton } from '@/components/molecules';
import { Brand, Spacing, Radius } from '@/constants/theme';
import type { Country } from '@/constants/countries';

interface LoginFormProps {
  role?: 'user' | 'vendor';
  onSubmitPhone: (phone: string, countryCode: string) => void;
  onGooglePress?: () => void;
  onCreateAccount: () => void;
  isLoading?: boolean;
  error?: string;
}

export default function LoginForm({
  role,
  onSubmitPhone,
  onGooglePress,
  onCreateAccount,
  isLoading = false,
  error,
}: LoginFormProps) {
  const [phone, setPhone] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [phoneError, setPhoneError] = useState<string | undefined>(error);

  const handlePhoneChange = (digits: string, full: string) => {
    setPhone(digits);
    setPhoneError(undefined);
  };

  const handleCountryChange = (country: Country) => {
    setCountryCode(country.dialCode);
  };

  const handleSubmit = () => {
    if (phone.length < 7) {
      setPhoneError('Please enter a valid phone number');
      return;
    }
    onSubmitPhone(phone, countryCode);
  };

  const isVendor = role === 'vendor';

  return (
    <Animated.View
      entering={FadeInDown.springify().damping(18).stiffness(100)}
      style={[
        styles.card,
        isVendor && styles.cardVendor,
      ]}>
      {/* Role indicator */}
      {role && (
        <View style={[styles.roleBadge, isVendor && styles.roleBadgeVendor]}>
          <Text style={[styles.roleText, isVendor && styles.roleTextVendor]}>
            {isVendor ? 'Vendor Login' : 'Customer Login'}
          </Text>
        </View>
      )}

      <Text style={styles.title}>Sign in to Ruxstar</Text>
      <Text style={styles.subtitle}>Enter your mobile number to continue</Text>

      {/* Phone input */}
      <PhoneInput
        value={phone}
        onChangeText={handlePhoneChange}
        onCountryChange={handleCountryChange}
        error={phoneError ?? error}
        placeholder="Mobile number"
      />

      {/* CTA */}
      <PrimaryButton
        label="Continue with OTP"
        onPress={handleSubmit}
        variant={isVendor ? 'vendor' : 'primary'}
        isLoading={isLoading}
        disabled={phone.length < 7}
        icon="→"
        iconPosition="right"
      />

      {/* Social login */}
      {onGooglePress && (
        <>
          <Divider label="or" style={styles.divider} />
          <SocialLoginButton
            provider="google"
            onPress={onGooglePress}
            disabled={isLoading}
          />
        </>
      )}

      {/* Register link */}
      <Pressable onPress={onCreateAccount} style={styles.registerRow}>
        <Text style={styles.registerText}>New here? </Text>
        <Text style={[styles.registerText, styles.registerLink]}>
          Create an account
        </Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Brand.surfaceCard,
    borderWidth: 1,
    borderColor: Brand.surfaceCardBorder,
    borderRadius: Radius.xl,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  cardVendor: {
    borderColor: 'rgba(245,166,35,0.2)',
  },
  roleBadge: {
    alignSelf: 'center',
    backgroundColor: Brand.glass,
    borderWidth: 1,
    borderColor: Brand.glassBorder,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
  },
  roleBadgeVendor: {
    backgroundColor: Brand.glass,
    borderColor: Brand.glassBorderStrong,
  },
  roleText: {
    color: Brand.primaryLight,
    fontSize: 12,
    fontWeight: '600',
  },
  roleTextVendor: {
    color: Brand.primaryXLight,
  },
  title: {
    color: Brand.textOnDark,
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    color: Brand.textOnDarkSecondary,
    fontSize: 14,
    textAlign: 'center',
    marginTop: -Spacing.two,
  },
  divider: {
    marginVertical: Spacing.one,
  },
  registerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: Spacing.one,
  },
  registerText: {
    color: Brand.textOnDarkSecondary,
    fontSize: 14,
  },
  registerLink: {
    color: Brand.primary,
    fontWeight: '600',
  },
});

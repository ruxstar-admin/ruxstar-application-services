/**
 * SocialLoginButton — Molecule
 *
 * A pill-shaped button for third-party auth providers (Google, Apple, etc.)
 * Combines: provider icon + label + press animation.
 */

import React from 'react';
import { Pressable, Text, View, StyleSheet, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { Brand, Radius, Spacing } from '@/constants/theme';

type Provider = 'google' | 'apple' | 'facebook';

interface SocialLoginButtonProps {
  provider: Provider;
  onPress: () => void;
  isLoading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

const PROVIDER_CONFIG: Record<
  Provider,
  { icon: string; label: string; bg: string; border: string; textColor: string }
> = {
  google: {
    icon: '🔵',
    label: 'Continue with Google',
    bg: 'rgba(0,0,0,0.04)',
    border: 'rgba(0,0,0,0.10)',
    textColor: Brand.textOnDark,
  },
  apple: {
    icon: '🍎',
    label: 'Continue with Apple',
    bg: 'rgba(0,0,0,0.04)',
    border: 'rgba(0,0,0,0.10)',
    textColor: Brand.textOnDark,
  },
  facebook: {
    icon: '📘',
    label: 'Continue with Facebook',
    bg: 'rgba(24,119,242,0.1)',
    border: 'rgba(24,119,242,0.3)',
    textColor: Brand.textOnDark,
  },
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function SocialLoginButton({
  provider,
  onPress,
  isLoading = false,
  disabled = false,
  style,
}: SocialLoginButtonProps) {
  const config = PROVIDER_CONFIG[provider];
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const isDisabled = disabled || isLoading;

  return (
    <AnimatedPressable
      onPress={isDisabled ? undefined : onPress}
      onPressIn={() => {
        if (!isDisabled) scale.value = withSpring(0.97, { damping: 12, stiffness: 250 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 10, stiffness: 180 });
      }}
      style={[
        animStyle,
        styles.button,
        {
          backgroundColor: config.bg,
          borderColor: config.border,
          opacity: isDisabled ? 0.5 : 1,
        },
        style,
      ]}
      accessibilityRole="button"
      accessibilityLabel={config.label}>
      <Text style={styles.icon}>{config.icon}</Text>
      <Text style={[styles.label, { color: config.textColor }]}>
        {config.label}
      </Text>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.pill,
    borderWidth: 1.5,
    minHeight: 52,
    paddingHorizontal: Spacing.five,
    gap: Spacing.two,
  },
  icon: {
    fontSize: 20,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});

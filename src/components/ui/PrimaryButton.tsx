/**
 * PrimaryButton — CRED-style premium CTA button
 * Variants: primary | outline | ghost | vendor | glass
 */

import React from 'react';
import {
  Pressable,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { Brand, Radius, Spacing } from '@/constants/theme';

type ButtonVariant = 'primary' | 'vendor' | 'outline' | 'ghost' | 'glass' | 'white';

interface PrimaryButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  isLoading?: boolean;
  disabled?: boolean;
  icon?: string;
  iconPosition?: 'left' | 'right';
  style?: ViewStyle;
  labelStyle?: TextStyle;
  fullWidth?: boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function PrimaryButton({
  label,
  onPress,
  variant = 'primary',
  isLoading = false,
  disabled = false,
  icon,
  iconPosition = 'right',
  style,
  labelStyle,
  fullWidth = true,
}: PrimaryButtonProps) {
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (!disabled && !isLoading) {
      scale.value = withSpring(0.97, { damping: 15, stiffness: 300 });
    }
  };
  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 12, stiffness: 200 });
  };

  const isDisabled = disabled || isLoading;

  const content = (
    <View style={styles.content}>
      {isLoading ? (
        <ActivityIndicator
          color={variant === 'white' ? '#FFFFFF' : '#FFFFFF'}
          size="small"
        />
      ) : (
        <>
          {icon && iconPosition === 'left' && (
            <Text style={[
              styles.icon,
              variant === 'white'   ? styles.iconDark :
              variant === 'outline' || variant === 'ghost' ? styles.iconDim : styles.iconLight,
            ]}>
              {icon}
            </Text>
          )}
          <Text
            style={[
              styles.label,
              variant === 'white'   && styles.labelWhite,
              variant === 'outline' && styles.labelOutline,
              variant === 'ghost'   && styles.labelGhost,
              isDisabled && styles.labelDisabled,
              labelStyle,
            ]}>
            {label}
          </Text>
          {icon && iconPosition === 'right' && (
            <Text style={[
              styles.icon,
              variant === 'white'   ? styles.iconDark :
              variant === 'outline' || variant === 'ghost' ? styles.iconDim : styles.iconLight,
            ]}>
              {icon}
            </Text>
          )}
        </>
      )}
    </View>
  );

  // ── Outline ──────────────────────────────────────────────────────────────────
  if (variant === 'outline') {
    return (
      <AnimatedPressable
        onPress={isDisabled ? undefined : onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          animStyle,
          styles.base,
          styles.outline,
          fullWidth && styles.fullWidth,
          isDisabled && styles.outlineDisabled,
          style,
        ]}
        accessibilityRole="button"
        accessibilityLabel={label}>
        {content}
      </AnimatedPressable>
    );
  }

  // ── Ghost ────────────────────────────────────────────────────────────────────
  if (variant === 'ghost') {
    return (
      <AnimatedPressable
        onPress={isDisabled ? undefined : onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          animStyle,
          styles.base,
          fullWidth && styles.fullWidth,
          style,
        ]}
        accessibilityRole="button"
        accessibilityLabel={label}>
        {content}
      </AnimatedPressable>
    );
  }

  // ── White — solid white, dark label ──────────────────────────────────────────
  if (variant === 'white') {
    return (
      <AnimatedPressable
        onPress={isDisabled ? undefined : onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          animStyle,
          styles.base,
          styles.white,
          isDisabled && styles.whiteDisabled,
          fullWidth && styles.fullWidth,
          style,
        ]}
        accessibilityRole="button"
        accessibilityLabel={label}>
        {content}
      </AnimatedPressable>
    );
  }

  // ── Glass — frosted white, no purple ─────────────────────────────────────────
  if (variant === 'glass') {
    return (
      <AnimatedPressable
        onPress={isDisabled ? undefined : onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          animStyle,
          styles.base,
          styles.glass,
          isDisabled && styles.glassDisabled,
          fullWidth && styles.fullWidth,
          style,
        ]}
        accessibilityRole="button"
        accessibilityLabel={label}>
        {content}
      </AnimatedPressable>
    );
  }

  // ── Primary / Vendor — solid (unchanged for non-auth screens) ────────────────
  return (
    <AnimatedPressable
      onPress={isDisabled ? undefined : onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        animStyle,
        styles.base,
        styles.solid,
        isDisabled && styles.solidDisabled,
        fullWidth && styles.fullWidth,
        style,
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}>
      {content}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  fullWidth: { alignSelf: 'stretch' },

  base: {
    borderRadius: Radius.pill,
    minHeight: 56,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.five,
  },

  // ── Solid purple (kept for vendor/app screens) ───────────────────────────────
  solid: {
    backgroundColor: Brand.primary,
    shadowColor: Brand.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  solidDisabled: {
    backgroundColor: Brand.surface2,
    shadowOpacity: 0,
    elevation: 0,
  },

  // ── White variant — now solid black on white bg, white text ─────────────────
  white: {
    backgroundColor: '#0A0A0F',
    borderColor: 'transparent',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  whiteDisabled: {
    backgroundColor: 'rgba(0,0,0,0.20)',
    shadowOpacity: 0,
    elevation: 0,
  },

  // ── Glass — frosted white ────────────────────────────────────────────────────
  glass: {
    backgroundColor: 'rgba(255, 255, 255, 0.13)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.32)',
    shadowColor: '#ffffff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.20,
    shadowRadius: 22,
    elevation: 6,
  },
  glassDisabled: {
    opacity: 0.40,
  },

  // ── Outline ──────────────────────────────────────────────────────────────────
  outline: {
    borderWidth: 1,
    borderColor: Brand.border2,
    backgroundColor: 'transparent',
  },
  outlineDisabled: { opacity: 0.45 },

  // ── Content row ──────────────────────────────────────────────────────────────
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  label: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  labelWhite:   { color: '#FFFFFF' },   // white text on black bg
  labelOutline: { color: Brand.creamSub },
  labelGhost:   { color: Brand.cream, fontWeight: '600' },
  labelDisabled:{ color: Brand.creamMuted },

  icon:       { fontSize: 16, fontWeight: '700' },
  iconLight:  { color: '#FFFFFF' },
  iconDark:   { color: '#FFFFFF' },
  iconDim:    { color: Brand.creamSub },
});

/**
 * OtpInput — single numeric text field (6 digits)
 *
 * • Strips all non-digit characters on every keystroke
 * • keyboardType="number-pad" — numeric keyboard only
 * • Wide pill-style input with large spaced digits
 * • Error state → red border + shake
 * • Success state → green border + spring pop
 */

import React, { useRef, useEffect } from 'react';
import {
  TextInput,
  StyleSheet,
  Platform,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { Brand, Radius } from '@/constants/theme';

const OTP_LENGTH = 6;

interface OtpInputProps {
  value: string;
  onChange: (otp: string) => void;
  isError?: boolean;
  isSuccess?: boolean;
  disabled?: boolean;
}

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

export default function OtpInput({
  value,
  onChange,
  isError = false,
  isSuccess = false,
  disabled = false,
}: OtpInputProps) {
  const inputRef = useRef<TextInput>(null);

  // ── Shake on error ────────────────────────────────────────────────────────
  const shakeX = useSharedValue(0);
  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }],
  }));

  useEffect(() => {
    if (isError) {
      shakeX.value = withSequence(
        withTiming(-10, { duration: 55 }),
        withTiming(10,  { duration: 55 }),
        withTiming(-10, { duration: 55 }),
        withTiming(10,  { duration: 55 }),
        withTiming(0,   { duration: 55 }),
      );
    }
  }, [isError]);

  // ── Pop on success ────────────────────────────────────────────────────────
  const scale = useSharedValue(1);
  const popStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  useEffect(() => {
    if (isSuccess) {
      scale.value = withSequence(
        withSpring(1.04, { damping: 4, stiffness: 200 }),
        withSpring(1,    { damping: 8, stiffness: 120 }),
      );
    }
  }, [isSuccess]);

  // ── Border colour ─────────────────────────────────────────────────────────
  const borderColor = isSuccess
    ? Brand.success
    : isError
    ? Brand.error
    : value.length > 0
    ? 'rgba(0,0,0,0.25)'
    : Brand.surfaceCardBorder;

  const textColor = isSuccess
    ? Brand.success
    : isError
    ? Brand.error
    : Brand.textOnDark;

  // ── Digit filter ──────────────────────────────────────────────────────────
  const handleChange = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, OTP_LENGTH);
    onChange(digits);
  };

  return (
    <Animated.View style={[styles.wrap, shakeStyle, popStyle, { borderColor }]}>
      <AnimatedTextInput
        ref={inputRef}
        style={[styles.input, { color: textColor }]}
        value={value}
        onChangeText={handleChange}
        keyboardType="number-pad"
        maxLength={OTP_LENGTH}
        editable={!disabled}
        autoFocus
        textAlign="center"
        selectionColor={isSuccess ? Brand.success : isError ? Brand.error : Brand.primary}
        cursorColor={isSuccess ? Brand.success : isError ? Brand.error : Brand.primary}
        caretHidden={false}
        autoComplete="sms-otp"
        textContentType="oneTimeCode"
        importantForAutofill="yes"
        placeholder="——————"
        placeholderTextColor="rgba(0,0,0,0.20)"
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    borderWidth: 1.5,
    borderRadius: Radius.lg,
    backgroundColor: Brand.surfaceCard,
    overflow: 'hidden',
    // Glow handled via border only — no shadow to keep it clean
  },
  input: {
    height: 72,
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: 14,
    paddingHorizontal: 20,
    // push letter-spacing indent back so digits centre visually
    textAlign: 'center',
    includeFontPadding: false,
  },
});

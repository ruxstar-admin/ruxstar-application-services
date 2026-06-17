/**
 * InputField — CRED-style minimal input
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  interpolateColor,
} from 'react-native-reanimated';

import { Brand, Radius, Spacing } from '@/constants/theme';

interface InputFieldProps extends TextInputProps {
  label?: string;
  error?: string;
  helper?: string;
  leadingIcon?: string;
  trailingIcon?: string;
  onTrailingPress?: () => void;
  containerStyle?: ViewStyle;
  required?: boolean;
  isPassword?: boolean;
}

const AnimatedView = Animated.createAnimatedComponent(View);

export default function InputField({
  label,
  error,
  helper,
  leadingIcon,
  trailingIcon,
  onTrailingPress,
  containerStyle,
  required,
  isPassword,
  style,
  ...props
}: InputFieldProps) {
  const [showPassword, setShowPassword] = useState(false);
  const isFocused = useSharedValue(0);

  const borderAnimStyle = useAnimatedStyle(() => ({
    borderColor: error
      ? Brand.error
      : interpolateColor(isFocused.value, [0, 1], [Brand.border1, Brand.border3]),
    backgroundColor: interpolateColor(
      isFocused.value,
      [0, 1],
      ['#F5F5F7', '#FFFFFF'],
    ),
  }));

  return (
    <View style={[styles.wrapper, containerStyle]}>
      {label && (
        <Text style={styles.label}>
          {label}
          {required && <Text style={styles.required}> *</Text>}
        </Text>
      )}

      <AnimatedView style={[styles.inputContainer, borderAnimStyle]}>
        {leadingIcon && (
          <Text style={styles.leadingIcon}>{leadingIcon}</Text>
        )}

        <TextInput
          style={[styles.input, style]}
          placeholderTextColor={Brand.creamMuted}
          selectionColor={Brand.primary}
          cursorColor={Brand.primary}
          secureTextEntry={isPassword && !showPassword}
          onFocus={() => { isFocused.value = withTiming(1, { duration: 180 }); }}
          onBlur={() =>  { isFocused.value = withTiming(0, { duration: 180 }); }}
          {...props}
        />

        {isPassword ? (
          <Pressable
            onPress={() => setShowPassword((v) => !v)}
            style={styles.trailingButton}
            hitSlop={8}>
            <Text style={styles.trailingText}>{showPassword ? 'HIDE' : 'SHOW'}</Text>
          </Pressable>
        ) : trailingIcon ? (
          <Pressable
            onPress={onTrailingPress}
            style={styles.trailingButton}
            hitSlop={8}
            disabled={!onTrailingPress}>
            <Text style={styles.trailingText}>{trailingIcon}</Text>
          </Pressable>
        ) : null}
      </AnimatedView>

      {error ? (
        <Text style={styles.error}>{error}</Text>
      ) : helper ? (
        <Text style={styles.helper}>{helper}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 6 },

  label: {
    color: Brand.creamSub,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  required: { color: Brand.error },

  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Brand.border1,
    borderRadius: Radius.md,
    minHeight: 58,
    overflow: 'hidden',
  },

  input: {
    flex: 1,
    paddingHorizontal: Spacing.three,
    paddingVertical: 16,
    color: Brand.cream,
    fontSize: 17,
    fontWeight: '500',
  },

  leadingIcon: {
    fontSize: 18,
    paddingLeft: Spacing.three,
    paddingRight: Spacing.one,
  },

  trailingButton: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trailingText: {
    color: Brand.creamMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  error: {
    color: Brand.error,
    fontSize: 12,
    marginLeft: 2,
  },
  helper: {
    color: Brand.creamMuted,
    fontSize: 12,
    marginLeft: 2,
  },
});

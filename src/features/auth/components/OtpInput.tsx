import { useEffect, useRef, useState } from 'react';
import { NativeSyntheticEvent, StyleSheet, TextInput, TextInputKeyPressEventData } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { Brand, Radius, Typography } from '@/constants/theme';
import { Motion } from '@/constants/motion';
import { Feedback } from '@/lib/haptics';

const CELL_COUNT = 6;

interface OtpInputProps {
  value: string;
  onChangeText: (value: string) => void;
  autoFocus?: boolean;
  hasError?: boolean;
}

export function OtpInput({ value, onChangeText, autoFocus, hasError }: OtpInputProps) {
  const inputRefs = useRef<(TextInput | null)[]>([]);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const shake = useSharedValue(0);

  useEffect(() => {
    if (!autoFocus) return;
    const timeout = setTimeout(() => inputRefs.current[0]?.focus(), Motion.duration.slow);
    return () => clearTimeout(timeout);
  }, [autoFocus]);

  useEffect(() => {
    if (hasError) {
      Feedback.error();
      shake.value = withSequence(
        withTiming(-8, { duration: 40 }),
        withTiming(8, { duration: 40 }),
        withTiming(-6, { duration: 40 }),
        withTiming(0, { duration: 40 }),
      );
    }
  }, [hasError, shake]);

  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shake.value }],
  }));

  const setDigit = (index: number, digit: string) => {
    const next = value.split('');
    next[index] = digit;
    const joined = next.join('').slice(0, CELL_COUNT);
    onChangeText(joined);

    if (digit && index < CELL_COUNT - 1) {
      Feedback.select();
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (index: number, text: string) => {
    if (text.length > 1) {
      onChangeText(text.replace(/\D/g, '').slice(0, CELL_COUNT));
      inputRefs.current[CELL_COUNT - 1]?.focus();
      return true;
    }
    setDigit(index, text.replace(/\D/g, ''));
    return false;
  };

  const handleKeyPress = (index: number, e: NativeSyntheticEvent<TextInputKeyPressEventData>) => {
    if (e.nativeEvent.key === 'Backspace' && !value[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  return (
    <Animated.View style={[styles.row, shakeStyle]}>
      {Array.from({ length: CELL_COUNT }).map((_, index) => (
        <TextInput
          key={index}
          ref={(el) => {
            inputRefs.current[index] = el;
          }}
          style={[styles.cell, focusedIndex === index && styles.cellFocused, hasError && styles.cellError]}
          onFocus={() => setFocusedIndex(index)}
          onBlur={() => setFocusedIndex((current) => (current === index ? null : current))}
          value={value[index] ?? ''}
          onChangeText={(text) => handlePaste(index, text)}
          onKeyPress={(e) => handleKeyPress(index, e)}
          keyboardType="number-pad"
          maxLength={CELL_COUNT}
          selectTextOnFocus
        />
      ))}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  cell: {
    flex: 1,
    maxWidth: 56,
    height: 56,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: Brand.surfaceAlt,
    textAlign: 'center',
    ...Typography.title,
    color: Brand.text,
  },
  cellFocused: {
    borderColor: Brand.text,
  },
  cellError: {
    borderColor: Brand.error,
  },
});

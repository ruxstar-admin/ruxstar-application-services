/**
 * CountdownTimer — Atom
 *
 * Counts down from `seconds` to 0 and fires `onComplete`.
 * Used on the OTP screen for "Resend in 0:45".
 */

import React, { useEffect, useRef, useState } from 'react';
import { Text, StyleSheet, type TextStyle } from 'react-native';

import { Brand } from '@/constants/theme';

interface CountdownTimerProps {
  /** Initial seconds to count down from */
  seconds: number;
  /** Called when timer reaches 0 */
  onComplete?: () => void;
  /** Reset trigger — increment this value to restart the timer */
  resetKey?: number;
  style?: TextStyle;
}

function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

export default function CountdownTimer({
  seconds,
  onComplete,
  resetKey = 0,
  style,
}: CountdownTimerProps) {
  const [remaining, setRemaining] = useState(seconds);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Reset when resetKey changes
  useEffect(() => {
    setRemaining(seconds);
  }, [resetKey, seconds]);

  useEffect(() => {
    if (remaining <= 0) {
      onComplete?.();
      return;
    }

    intervalRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [remaining === 0 ? 'done' : 'running', resetKey]);

  const isDone = remaining === 0;

  return (
    <Text
      style={[
        styles.text,
        isDone ? styles.done : styles.counting,
        style,
      ]}>
      {isDone ? 'now' : formatTime(remaining)}
    </Text>
  );
}

const styles = StyleSheet.create({
  text: {
    fontSize: 14,
    fontWeight: '600',
  },
  counting: {
    color: Brand.textOnDarkSecondary,
  },
  done: {
    color: Brand.primary,
  },
});

/**
 * ProgressBar — Atom
 *
 * Animated step-progress bar used in the registration flow.
 * Shows "Step X of Y" label above a smooth fill bar.
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
} from 'react-native-reanimated';

import { Brand, Radius, Spacing } from '@/constants/theme';

interface ProgressBarProps {
  /** Current step (1-based) */
  step: number;
  /** Total number of steps */
  totalSteps: number;
  /** Show "Step N of M" text label */
  showLabel?: boolean;
  /** Bar height in px */
  height?: number;
  /** Bar color — defaults to Brand.primary */
  color?: string;
  style?: ViewStyle;
}

export default function ProgressBar({
  step,
  totalSteps,
  showLabel = true,
  height = 4,
  color = Brand.primary,
  style,
}: ProgressBarProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(step / totalSteps, {
      duration: 400,
      easing: Easing.out(Easing.cubic),
    });
  }, [step, totalSteps]);

  const barStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  return (
    <View style={[styles.wrapper, style]}>
      {showLabel && (
        <Text style={styles.label}>
          Step {step} of {totalSteps}
        </Text>
      )}

      {/* Track */}
      <View
        style={[
          styles.track,
          { height, borderRadius: height / 2, backgroundColor: Brand.surfaceCardBorder },
        ]}>
        {/* Fill */}
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            barStyle,
            {
              backgroundColor: color,
              borderRadius: height / 2,
              shadowColor: color,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.6,
              shadowRadius: 6,
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: Spacing.one,
  },
  label: {
    color: Brand.textOnDarkSecondary,
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'right',
  },
  track: {
    overflow: 'hidden',
    position: 'relative',
  },
});

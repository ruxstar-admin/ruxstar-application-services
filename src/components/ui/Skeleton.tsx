import { useEffect } from 'react';
import type { DimensionValue, ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { Brand, Radius } from '@/constants/theme';

interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  radius?: number;
  style?: ViewStyle;
}

/** Placeholder block shown while content loads; pulses unless reduced motion is on. */
export function Skeleton({ width = '100%', height = 16, radius = Radius.sm, style }: SkeletonProps) {
  const pulse = useSharedValue(0.5);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (reduceMotion) return;
    pulse.value = withRepeat(withTiming(1, { duration: 800, easing: Easing.inOut(Easing.quad) }), -1, true);
  }, [pulse, reduceMotion]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));

  return (
    <Animated.View
      accessibilityElementsHidden
      style={[{ width, height, borderRadius: radius, backgroundColor: Brand.surfaceAlt }, style, animatedStyle]}
    />
  );
}

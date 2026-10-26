import { StyleSheet } from 'react-native';
import Animated, { interpolate, useAnimatedStyle } from 'react-native-reanimated';
import { Spacing } from '@/constants/theme';
import { HeroCaption } from '@/features/auth/components/HeroCaption';
import { useKeyboardProgress } from '@/hooks/use-keyboard-progress';

/** Rotating caption above the welcome sheet (the artwork is painted behind the whole screen); fades away as the keyboard rises. */
export function AuthHero() {
  const keyboard = useKeyboardProgress();

  const contentStyle = useAnimatedStyle(() => ({
    opacity: interpolate(keyboard.value, [0, 0.7], [1, 0], 'clamp'),
    transform: [{ scale: interpolate(keyboard.value, [0, 1], [1, 0.9]) }],
  }));

  return (
    <Animated.View style={[styles.content, contentStyle]} pointerEvents="none">
      <HeroCaption />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: Spacing.three, paddingHorizontal: Spacing.four },
});

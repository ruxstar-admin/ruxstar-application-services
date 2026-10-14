import { useEffect } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { Brand, Typography } from '@/constants/theme';
import { Feedback } from '@/lib/haptics';

interface TextLinkProps {
  label: string;
  onPress: () => void;
  muted?: boolean;
  /** Change this number to make the link shake and draw the eye (0 / unchanged = no shake). */
  attentionKey?: number;
}

const SHAKE_STEP_MS = 50;

/** Inline text action with the dotted underline District uses for links ("Back to login"). */
export function TextLink({ label, onPress, muted, attentionKey = 0 }: TextLinkProps) {
  const shake = useSharedValue(0);

  useEffect(() => {
    if (attentionKey === 0) return;
    shake.value = withSequence(
      withTiming(-8, { duration: SHAKE_STEP_MS }),
      withTiming(8, { duration: SHAKE_STEP_MS }),
      withTiming(-6, { duration: SHAKE_STEP_MS }),
      withTiming(6, { duration: SHAKE_STEP_MS }),
      withTiming(0, { duration: SHAKE_STEP_MS }),
    );
  }, [attentionKey, shake]);

  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }] }));

  return (
    <Animated.View style={shakeStyle}>
      <Pressable
        accessibilityRole="link"
        hitSlop={8}
        onPress={() => {
          Feedback.select();
          onPress();
        }}
      >
        <Text style={[styles.text, muted && styles.muted]}>{label}</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  text: {
    ...Typography.body,
    color: Brand.text,
    textDecorationLine: 'underline',
    textDecorationStyle: 'dotted',
  },
  muted: { ...Typography.caption, color: Brand.textMuted },
});

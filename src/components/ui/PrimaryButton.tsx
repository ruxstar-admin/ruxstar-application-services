import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { Feedback } from '@/lib/haptics';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const SPRING = { damping: 18, stiffness: 300 } as const;

interface PrimaryButtonProps {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'outline';
}

export function PrimaryButton({ label, onPress, loading, disabled, variant = 'primary' }: PrimaryButtonProps) {
  const scale = useSharedValue(1);
  const isDisabled = disabled || loading;
  const isPrimary = variant === 'primary';

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!isDisabled, busy: !!loading }}
      onPress={onPress}
      disabled={isDisabled}
      onPressIn={() => {
        scale.value = withSpring(0.97, SPRING);
        Feedback.tap();
      }}
      onPressOut={() => {
        scale.value = withSpring(1, SPRING);
      }}
      style={[
        styles.base,
        isPrimary ? styles.primary : styles.outline,
        disabled && !loading && isPrimary && styles.disabled,
        animatedStyle,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? Brand.onAction : Brand.primary} />
      ) : (
        <Text
          style={[
            styles.label,
            !isPrimary && styles.labelOutline,
            disabled && isPrimary && styles.labelDisabled,
          ]}
        >
          {label}
        </Text>
      )}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 56,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
  },
  primary: { backgroundColor: Brand.action },
  outline: { backgroundColor: 'transparent', borderWidth: 1, borderColor: Brand.border },
  disabled: { backgroundColor: Brand.disabled },
  label: { ...Typography.bodyStrong, color: Brand.onAction },
  labelOutline: { color: Brand.text },
  labelDisabled: { color: Brand.disabledText },
});

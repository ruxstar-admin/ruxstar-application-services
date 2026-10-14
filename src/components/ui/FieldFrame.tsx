import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { Brand, Spacing, Typography } from '@/constants/theme';

interface FieldFrameProps {
  label?: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}

const SHAKE_STEP_MS = 45;

/**
 * Label above the control, a reserved helper/error line below it (so showing an error never
 * pushes the layout), and a shake whenever an error newly appears. Shared by every text control.
 */
export function FieldFrame({ label, error, hint, children }: FieldFrameProps) {
  const shake = useSharedValue(0);

  useEffect(() => {
    if (!error) return;
    shake.value = withSequence(
      withTiming(-8, { duration: SHAKE_STEP_MS }),
      withTiming(8, { duration: SHAKE_STEP_MS }),
      withTiming(-5, { duration: SHAKE_STEP_MS }),
      withTiming(0, { duration: SHAKE_STEP_MS }),
    );
  }, [error, shake]);

  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }] }));

  return (
    <View>
      {label ? (
        <Text style={styles.label} maxFontSizeMultiplier={1.3}>
          {label}
        </Text>
      ) : null}
      <Animated.View style={shakeStyle}>{children}</Animated.View>
      <View style={styles.helperRow} accessibilityLiveRegion="polite">
        {error ? (
          <>
            <Ionicons name="alert-circle" size={14} color={Brand.error} style={styles.helperIcon} />
            <Text style={[styles.helper, styles.errorText]} maxFontSizeMultiplier={1.3}>
              {error}
            </Text>
          </>
        ) : hint ? (
          <Text style={styles.helper} maxFontSizeMultiplier={1.3}>
            {hint}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { ...Typography.caption, color: Brand.textMuted, marginBottom: Spacing.two },
  helperRow: { flexDirection: 'row', alignItems: 'flex-start', minHeight: 20, marginTop: Spacing.one + Spacing.half },
  helperIcon: { marginRight: Spacing.one, marginTop: 1 },
  helper: { ...Typography.caption, flex: 1, color: Brand.textMuted },
  errorText: { color: Brand.error },
});

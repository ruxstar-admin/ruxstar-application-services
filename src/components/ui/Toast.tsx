import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';

interface ToastProps {
  message: string;
  visible: boolean;
  onDismiss: () => void;
  durationMs?: number;
}

const DEFAULT_DURATION_MS = 4000;

/**
 * Small, non-blocking notice that slides in, auto-dismisses and never intercepts touches.
 * Render it as an overlay (see AuthFormLayout's `overlay` prop). Haptics are the caller's job.
 */
export function Toast({ message, visible, onDismiss, durationMs = DEFAULT_DURATION_MS }: ToastProps) {
  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(onDismiss, durationMs);
    return () => clearTimeout(timer);
  }, [visible, message, durationMs, onDismiss]);

  return (
    <View pointerEvents="none" style={styles.host}>
      {visible ? (
        <Animated.View
          entering={FadeInDown.duration(250).springify().damping(16)}
          exiting={FadeOutUp.duration(200)}
          style={styles.toast}
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
        >
          <Ionicons name="information-circle" size={20} color={Brand.primary} />
          <Text style={styles.message} maxFontSizeMultiplier={1.3}>
            {message}
          </Text>
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  host: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: Spacing.three, zIndex: 10 },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.lg,
    backgroundColor: Brand.surfaceAlt,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Brand.border,
  },
  message: { ...Typography.caption, flex: 1, color: Brand.text },
});

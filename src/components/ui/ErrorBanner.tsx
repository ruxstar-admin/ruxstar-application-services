import { Pressable, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { Feedback } from '@/lib/haptics';

interface ErrorBannerProps {
  message: string;
  /** Shown as a "Retry" action for transient failures (offline, timeout, server). */
  onRetry?: () => void;
}

/** Form-level error that isn't tied to a single field (offline, server, disabled account). */
export function ErrorBanner({ message, onRetry }: ErrorBannerProps) {
  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(150)}
      style={styles.banner}
      accessibilityRole="alert"
    >
      <Ionicons name="alert-circle" size={20} color={Brand.error} />
      <Text style={styles.message} maxFontSizeMultiplier={1.3}>
        {message}
      </Text>
      {onRetry ? (
        <Pressable
          accessibilityRole="button"
          hitSlop={8}
          onPress={() => {
            Feedback.tap();
            onRetry();
          }}
        >
          <Text style={styles.retry}>Retry</Text>
        </Pressable>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.md,
    backgroundColor: 'rgba(255,69,58,0.12)',
  },
  message: { ...Typography.caption, flex: 1, color: Brand.text },
  retry: { ...Typography.caption, fontFamily: Typography.bodyStrong.fontFamily, color: Brand.primary },
});

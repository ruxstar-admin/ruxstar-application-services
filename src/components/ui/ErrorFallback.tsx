import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Brand, Spacing, Typography } from '@/constants/theme';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { reportError } from '@/lib/monitoring';

interface ErrorFallbackProps {
  error: Error;
  retry: () => void;
}

/** Full-screen fallback for an uncaught render error, so the user gets a way back instead of a blank screen. */
export function ErrorFallback({ error, retry }: ErrorFallbackProps) {
  useEffect(() => {
    reportError(error, 'render-boundary');
  }, [error]);

  return (
    <View style={styles.container} accessibilityRole="alert">
      <Ionicons name="alert-circle-outline" size={56} color={Brand.error} />
      <Text style={styles.title}>Something went wrong</Text>
      <Text style={styles.body}>
        An unexpected error occurred. Your data is safe. Please try again.
      </Text>
      {__DEV__ ? <Text style={styles.detail}>{error.message}</Text> : null}
      <View style={styles.action}>
        <PrimaryButton label="Try again" onPress={retry} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Brand.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
    gap: Spacing.three,
  },
  title: { ...Typography.title, color: Brand.text, textAlign: 'center' },
  body: { ...Typography.body, color: Brand.textMuted, textAlign: 'center' },
  detail: { ...Typography.caption, color: Brand.textFaint, textAlign: 'center' },
  action: { alignSelf: 'stretch', marginTop: Spacing.three },
});

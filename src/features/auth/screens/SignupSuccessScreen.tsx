import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, { Easing, FadeInUp } from 'react-native-reanimated';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { SUCCESS_LANDS_MS, SuccessBadge } from '@/features/auth/components/SuccessBadge';
import { Brand, Spacing, Typography } from '@/constants/theme';
import { useAuthStore } from '@/stores/auth-store';

/** Each block rises in a beat after the one above it, starting as the check lands. */
const rise = (step: number) =>
  FadeInUp.delay(SUCCESS_LANDS_MS + 80 * step)
    .duration(420)
    .easing(Easing.out(Easing.cubic));

/** Shown once, straight after signup, after the optional photo step. */
export function SignupSuccessScreen() {
  const router = useRouter();
  const name = useAuthStore((s) => s.name) ?? '';
  const firstName = name.split(' ')[0];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <SuccessBadge />
        <Animated.Text entering={rise(0)} style={styles.title}>
          {firstName ? `You're in, ${firstName}` : "You're in"}
        </Animated.Text>
        <Animated.Text entering={rise(1)} style={styles.message}>
          Your Ruxstar account is ready. Add a bio and your city any time from your profile.
        </Animated.Text>
      </View>
      <Animated.View entering={rise(2)} style={styles.actions}>
        <PrimaryButton label="Start exploring" onPress={() => router.replace('/(customer)/(tabs)')} />
        <PrimaryButton label="Go to my profile" variant="outline" onPress={() => router.replace('/(customer)/(tabs)/profile')} />
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Brand.bg, paddingHorizontal: Spacing.three, paddingBottom: Spacing.three },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.three },
  title: { ...Typography.title, color: Brand.text, textAlign: 'center' },
  message: { ...Typography.body, color: Brand.textMuted, textAlign: 'center', maxWidth: 320 },
  actions: { gap: Spacing.two },
});

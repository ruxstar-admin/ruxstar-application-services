import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { useAuthStore } from '@/stores/auth-store';

/** Shown once, straight after signup. AuthGuard lands here via the pending login route. */
export function SignupSuccessScreen() {
  const router = useRouter();
  const name = useAuthStore((s) => s.name) ?? '';
  const firstName = name.split(' ')[0];

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View entering={FadeInUp.duration(450)} style={styles.content}>
        <View style={styles.badge}>
          <Ionicons name="checkmark" size={40} color={Brand.primarySoft} />
        </View>
        <Text style={styles.title}>{firstName ? `You're in, ${firstName}` : "You're in"}</Text>
        <Text style={styles.message}>Your Ruxstar account is ready. Add a bio and link any time from your profile.</Text>
      </Animated.View>
      <View style={styles.actions}>
        <PrimaryButton label="Start exploring" onPress={() => router.replace('/(customer)/(tabs)')} />
        <PrimaryButton label="Go to my profile" variant="outline" onPress={() => router.replace('/(customer)/(tabs)/profile')} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Brand.bg, paddingHorizontal: Spacing.three, paddingBottom: Spacing.three },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.three },
  badge: {
    width: 88,
    height: 88,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(180,92,242,0.14)',
  },
  title: { ...Typography.title, color: Brand.text, textAlign: 'center' },
  message: { ...Typography.body, color: Brand.textMuted, textAlign: 'center', maxWidth: 320 },
  actions: { gap: Spacing.two },
});

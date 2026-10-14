import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { AuthHero } from '@/features/auth/components/AuthHero';
import { PhoneInput } from '@/features/auth/components/PhoneInput';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { TextLink } from '@/components/ui/TextLink';
import { AuthService } from '@/services/auth-service';
import { ApiError } from '@/lib/api-error';
import { Feedback } from '@/lib/haptics';
import { useDelayedFocus } from '@/hooks/use-delayed-focus';

export function WelcomeScreen() {
  const router = useRouter();
  const phoneRef = useDelayedFocus<TextInput>();

  const [mobile, setMobile] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleContinue = async () => {
    setError(null);
    setLoading(true);
    try {
      await AuthService.signupSendOtp(mobile);
      router.push({ pathname: '/(auth)/otp', params: { mode: 'signup', mobile } });
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        router.push({ pathname: '/(auth)/login', params: { mobile } });
        return;
      }
      Feedback.error();
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <AuthHero />

        <Animated.View entering={FadeInUp.duration(450).delay(150)} style={styles.sheet}>
          <Text style={styles.heading}>For all your daily needs</Text>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.overline}>Log in or sign up</Text>
            <View style={styles.dividerLine} />
          </View>

          <PhoneInput ref={phoneRef} value={mobile} onChangeText={setMobile} error={error ?? undefined} />

          <PrimaryButton label="Continue" onPress={handleContinue} disabled={mobile.length !== 10} loading={loading} />

          <View style={styles.footer}>
            <Text style={styles.terms}>By continuing, you agree to our</Text>
            <View style={styles.links}>
              <TextLink muted label="Terms of Services" onPress={() => undefined} />
              <TextLink muted label="Privacy Policy" onPress={() => undefined} />
            </View>
          </View>
        </Animated.View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: Brand.bg },
  sheet: {
    backgroundColor: Brand.surface,
    borderTopLeftRadius: Radius.xxl,
    borderTopRightRadius: Radius.xxl,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.five,
    paddingBottom: Spacing.three,
    gap: Spacing.four,
  },
  heading: { ...Typography.heading, color: Brand.text, textAlign: 'center' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  dividerLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: Brand.border },
  overline: { ...Typography.overline, color: Brand.textMuted },
  footer: { alignItems: 'center', gap: Spacing.one },
  terms: { ...Typography.caption, color: Brand.textMuted },
  links: { flexDirection: 'row', gap: Spacing.four },
});

import { useState } from 'react';
import { KeyboardAvoidingView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { HeroBackdrop, type HeroFrame } from '@/features/auth/components/HeroBackdrop';
import { AuthHero } from '@/features/auth/components/AuthHero';
import { PhoneInput } from '@/features/auth/components/PhoneInput';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { TextLink } from '@/components/ui/TextLink';
import { AuthService } from '@/services/auth-service';
import { ApiError } from '@/lib/api-error';
import { useAuthRequest } from '@/features/auth/hooks/use-auth-request';
import { isValidMobile } from '@/features/auth/lib/validators';
import { useDelayedFocus } from '@/hooks/use-delayed-focus';

export function WelcomeScreen() {
  const router = useRouter();
  const [hero, setHero] = useState<HeroFrame>({ y: 0, height: 0 });
  const insets = useSafeAreaInsets();
  const phoneRef = useDelayedFocus<TextInput>();
  const { run, loading, error, errorFor, clearError } = useAuthRequest();

  const [mobile, setMobile] = useState('');

  const handleContinue = async () => {
    const sent = await run('signup-otp-send', async () => {
      try {
        await AuthService.sendOtp(mobile, 'signup');
        return true;
      } catch (err) {
        // Number already registered: not an error, send them to log in instead.
        if (err instanceof ApiError && err.code === 'PHONE_TAKEN') return false;
        throw err;
      }
    });

    if (sent === undefined) return;
    if (sent) router.push({ pathname: '/(auth)/otp', params: { mode: 'signup', mobile } });
    else router.push({ pathname: '/(auth)/login', params: { mobile } });
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior="padding">
      <SafeAreaView style={styles.container} edges={['top']}>
        <HeroBackdrop hero={hero} />
        <View style={styles.flex} onLayout={(e) => setHero((current) => (current.height ? current : e.nativeEvent.layout))}>
          <AuthHero />
        </View>

        <Animated.View
          entering={FadeInUp.duration(450).delay(150)}
          style={[styles.sheet, { paddingBottom: insets.bottom + Spacing.three }]}
        >
          <Text style={styles.heading}>For all your daily needs</Text>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.overline}>Log in or sign up</Text>
            <View style={styles.dividerLine} />
          </View>

          <PhoneInput
            ref={phoneRef}
            value={mobile}
            onChangeText={(text) => {
              setMobile(text);
              clearError();
            }}
            error={errorFor('mobile')}
          />

          {error?.target === 'form' ? (
            <ErrorBanner message={error.message} onRetry={error.retryable ? handleContinue : undefined} />
          ) : null}

          <PrimaryButton label="Continue" onPress={handleContinue} disabled={!isValidMobile(mobile)} loading={loading} />

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
    gap: Spacing.three,
  },
  heading: { ...Typography.heading, color: Brand.text, textAlign: 'center' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  dividerLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: Brand.border },
  overline: { ...Typography.overline, color: Brand.textMuted },
  footer: { alignItems: 'center', gap: Spacing.one },
  terms: { ...Typography.caption, color: Brand.textMuted },
  links: { flexDirection: 'row', gap: Spacing.four },
});

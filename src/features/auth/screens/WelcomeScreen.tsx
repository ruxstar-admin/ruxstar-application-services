import { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { Brand, Gradients, Radius, Spacing, Typography } from '@/constants/theme';
import { PhoneInput } from '@/features/auth/components/PhoneInput';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { AuthService } from '@/services/auth-service';
import { ApiError } from '@/lib/api-error';
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
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <SafeAreaView style={styles.container}>
        <LinearGradient colors={Gradients.authTop.colors} locations={Gradients.authTop.locations} style={styles.top}>
          <Animated.View entering={FadeInDown.duration(400)} style={styles.brand}>
            <Image source={require('@/assets/images/icon.png')} style={styles.logo} resizeMode="contain" />
            <Text style={styles.wordmark}>Ruxstar</Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(400).delay(150)}>
            <Text style={styles.tagline}>✦  Connect · Discover · Thrive  ✦</Text>
          </Animated.View>
        </LinearGradient>

        <Animated.View entering={FadeInUp.duration(400).delay(150)} style={styles.sheet}>
          <Text style={styles.heading}>For all your daily needs</Text>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.sheetLabel}>Log in or sign up</Text>
            <View style={styles.dividerLine} />
          </View>

          <PhoneInput ref={phoneRef} value={mobile} onChangeText={setMobile} error={error ?? undefined} />

          <PrimaryButton label="Continue" onPress={handleContinue} disabled={mobile.length !== 10} loading={loading} />

          <Pressable onPress={() => router.push('/(auth)/login')} style={styles.loginLink}>
            <Text style={styles.loginLinkText}>Already have an account? Log in</Text>
          </Pressable>

          <Text style={styles.terms}>
            By continuing, you agree to our <Text style={styles.termsLink}>Terms of Service</Text> and{' '}
            <Text style={styles.termsLink}>Privacy Policy</Text>
          </Text>
        </Animated.View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: Brand.bg,
  },
  top: {
    alignItems: 'center',
    justifyContent: 'center',
    flexGrow: 1,
    paddingHorizontal: Spacing.four,
  },
  brand: {
    alignItems: 'center',
    marginBottom: Spacing.four,
  },
  logo: {
    width: 72,
    height: 72,
    borderRadius: 18,
    marginBottom: Spacing.three,
  },
  wordmark: {
    ...Typography.display,
    color: Brand.text,
    letterSpacing: 0.5,
  },
  tagline: {
    ...Typography.caption,
    color: Brand.primary,
    letterSpacing: 1,
  },
  sheet: {
    backgroundColor: Brand.surface,
    borderTopLeftRadius: Radius.xxl,
    borderTopRightRadius: Radius.xxl,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.four,
    gap: Spacing.four,
  },
  heading: {
    ...Typography.body,
    fontWeight: '700',
    color: Brand.text,
    textAlign: 'center',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Brand.border,
  },
  sheetLabel: {
    ...Typography.caption,
    color: Brand.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  loginLink: {
    alignSelf: 'center',
  },
  loginLinkText: {
    ...Typography.caption,
    color: Brand.secondary,
  },
  terms: {
    ...Typography.caption,
    color: Brand.textFaint,
    textAlign: 'center',
  },
  termsLink: {
    color: Brand.textMuted,
    textDecorationLine: 'underline',
  },
});

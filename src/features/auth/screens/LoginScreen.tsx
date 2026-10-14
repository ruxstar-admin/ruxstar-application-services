import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Brand, Spacing, Typography } from '@/constants/theme';
import { PhoneInput } from '@/features/auth/components/PhoneInput';
import { InputField } from '@/components/ui/InputField';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { AuthService } from '@/services/auth-service';
import { useAuthStore } from '@/stores/auth-store';
import { ApiError } from '@/lib/api-error';
import { useDelayedFocus } from '@/hooks/use-delayed-focus';

type LoginMode = 'password' | 'otp';

export function LoginScreen() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const { mobile: prefillMobile } = useLocalSearchParams<{ mobile?: string }>();

  const [mode, setMode] = useState<LoginMode>('password');
  const [mobile, setMobile] = useState(prefillMobile ?? '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Only one field gets the delayed auto-focus: password when mobile arrived prefilled, else phone.
  const initialFocusRef = useDelayedFocus<TextInput>();
  const focusPhone = !prefillMobile;

  const mobileValid = mobile.length === 10;
  const canSubmit = mode === 'password' ? mobileValid && password.length >= 6 : mobileValid;

  const handleSubmit = async () => {
    setError(null);
    setLoading(true);
    try {
      if (mode === 'password') {
        const { token, user } = await AuthService.loginWithPassword(mobile, password);
        setAuth(token, user);
      } else {
        await AuthService.loginSendOtp(mobile);
        router.push({ pathname: '/(auth)/otp', params: { mode: 'login', mobile } });
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <SafeAreaView style={styles.container}>
        <Animated.View entering={FadeInUp.duration(350)} style={styles.form}>
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>Sign in to continue</Text>

          <PhoneInput ref={focusPhone ? initialFocusRef : undefined} value={mobile} onChangeText={setMobile} />

          {mode === 'password' ? (
            <InputField
              ref={!focusPhone ? initialFocusRef : undefined}
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="Enter your password"
            />
          ) : null}

          {error ? <Text style={styles.error}>{error}</Text> : null}

          {mode === 'password' ? (
            <Pressable disabled style={styles.forgotWrap}>
              <Text style={styles.forgotDisabled}>Forgot password? (coming soon)</Text>
            </Pressable>
          ) : null}

          <PrimaryButton
            label={mode === 'password' ? 'Log in' : 'Send OTP'}
            onPress={handleSubmit}
            disabled={!canSubmit}
            loading={loading}
          />

          <Pressable onPress={() => setMode(mode === 'password' ? 'otp' : 'password')} style={styles.switchWrap}>
            <Text style={styles.switchText}>
              {mode === 'password' ? 'Log in with OTP instead' : 'Log in with password instead'}
            </Text>
          </Pressable>

          <View style={styles.signupRow}>
            <Text style={styles.signupText}>New to Ruxstar? </Text>
            <Pressable onPress={() => router.push('/(auth)/welcome')}>
              <Text style={styles.signupLink}>Create account</Text>
            </Pressable>
          </View>
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
    paddingHorizontal: Spacing.four,
    justifyContent: 'center',
  },
  form: {
    gap: Spacing.three,
  },
  title: {
    ...Typography.title,
    color: Brand.text,
  },
  subtitle: {
    ...Typography.body,
    color: Brand.textMuted,
    marginBottom: Spacing.two,
  },
  error: {
    ...Typography.caption,
    color: Brand.error,
  },
  forgotWrap: {
    alignSelf: 'flex-end',
  },
  forgotDisabled: {
    ...Typography.caption,
    color: Brand.textFaint,
  },
  switchWrap: {
    alignSelf: 'center',
    marginTop: Spacing.one,
  },
  switchText: {
    ...Typography.caption,
    color: Brand.secondary,
  },
  signupRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: Spacing.four,
  },
  signupText: {
    ...Typography.caption,
    color: Brand.textMuted,
  },
  signupLink: {
    ...Typography.caption,
    color: Brand.primary,
    fontWeight: '700',
  },
});

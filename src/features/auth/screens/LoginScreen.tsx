import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Brand, Spacing, Typography } from '@/constants/theme';
import { AuthFormLayout } from '@/features/auth/components/AuthFormLayout';
import { PhoneInput } from '@/features/auth/components/PhoneInput';
import { InputField } from '@/components/ui/InputField';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { TextLink } from '@/components/ui/TextLink';
import { AuthService } from '@/services/auth-service';
import { useAuthStore } from '@/stores/auth-store';
import { ApiError } from '@/lib/api-error';
import { Feedback } from '@/lib/haptics';
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
        Feedback.success();
        setAuth(token, user);
      } else {
        await AuthService.loginSendOtp(mobile);
        router.push({ pathname: '/(auth)/otp', params: { mode: 'login', mobile } });
      }
    } catch (err) {
      Feedback.error();
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthFormLayout
      title="Welcome back"
      onBack={() => router.back()}
      actions={
        <>
          <PrimaryButton
            label={mode === 'password' ? 'Log in' : 'Send OTP'}
            onPress={handleSubmit}
            disabled={!canSubmit}
            loading={loading}
          />
          <View style={styles.center}>
            <TextLink
              label={mode === 'password' ? 'Log in with OTP instead' : 'Log in with password instead'}
              onPress={() => setMode(mode === 'password' ? 'otp' : 'password')}
            />
          </View>
        </>
      }
    >
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

      <View style={styles.signupRow}>
        <Text style={styles.signupText}>New to Ruxstar? </Text>
        <TextLink muted label="Create account" onPress={() => router.replace('/(auth)/welcome')} />
      </View>
    </AuthFormLayout>
  );
}

const styles = StyleSheet.create({
  subtitle: { ...Typography.body, color: Brand.textMuted },
  error: { ...Typography.caption, color: Brand.error },
  center: { alignItems: 'center' },
  signupRow: { flexDirection: 'row', justifyContent: 'center', marginTop: Spacing.three },
  signupText: { ...Typography.caption, color: Brand.textMuted },
});

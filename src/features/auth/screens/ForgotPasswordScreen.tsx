import { useState } from 'react';
import { StyleSheet, Text, TextInput } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AuthFormLayout } from '@/features/auth/components/AuthFormLayout';
import { PhoneInput } from '@/features/auth/components/PhoneInput';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { AuthService } from '@/services/auth-service';
import { useAuthRequest } from '@/features/auth/hooks/use-auth-request';
import { isValidMobile } from '@/features/auth/lib/validators';
import { Brand, Typography } from '@/constants/theme';
import { useDelayedFocus } from '@/hooks/use-delayed-focus';

export function ForgotPasswordScreen() {
  const router = useRouter();
  const { mobile: prefill } = useLocalSearchParams<{ mobile?: string }>();
  const phoneRef = useDelayedFocus<TextInput>();
  const { run, loading, error, errorFor, clearError } = useAuthRequest();
  const [mobile, setMobile] = useState(prefill ?? '');

  const handleSend = async () => {
    const sent = await run('forgot-otp-send', () => AuthService.sendOtp(mobile, 'reset'));
    if (sent) router.push({ pathname: '/(auth)/otp', params: { mode: 'reset', mobile } });
  };

  return (
    <AuthFormLayout
      title="Forgot password"
      onBack={() => router.back()}
      actions={<PrimaryButton label="Send code" onPress={handleSend} disabled={!isValidMobile(mobile)} loading={loading} />}
    >
      <Text style={styles.subtitle}>Enter your mobile number and we will send a code to reset your password.</Text>
      <PhoneInput
        ref={phoneRef}
        label="Mobile number"
        value={mobile}
        onChangeText={(text) => {
          setMobile(text);
          clearError();
        }}
        error={errorFor('mobile')}
      />
      {error?.target === 'form' ? <ErrorBanner message={error.message} onRetry={error.retryable ? handleSend : undefined} /> : null}
    </AuthFormLayout>
  );
}

const styles = StyleSheet.create({
  subtitle: { ...Typography.body, color: Brand.textMuted },
});

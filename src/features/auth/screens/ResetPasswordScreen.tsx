import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AuthFormLayout } from '@/features/auth/components/AuthFormLayout';
import { PasswordFields } from '@/features/auth/components/PasswordFields';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { AuthService } from '@/services/auth-service';
import { useAuthRequest } from '@/features/auth/hooks/use-auth-request';
import { isPasswordPairValid } from '@/features/auth/lib/validators';
import { Brand, Typography } from '@/constants/theme';
import { Feedback } from '@/lib/haptics';

export function ResetPasswordScreen() {
  const router = useRouter();
  const { verificationToken, mobile } = useLocalSearchParams<{ verificationToken: string; mobile: string }>();
  const { run, loading, error, errorFor, clearError } = useAuthRequest();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');

  const handleReset = async () => {
    const done = await run('password-reset', () => AuthService.resetPassword(verificationToken, password));
    if (!done) return;
    Feedback.success();
    router.replace({ pathname: '/(auth)/login', params: { mobile, notice: 'password-reset' } });
  };

  const onChange = (setter: (value: string) => void) => (value: string) => {
    setter(value);
    clearError();
  };

  return (
    <AuthFormLayout
      title="Create new password"
      onBack={() => router.back()}
      actions={
        <PrimaryButton
          label="Reset password"
          onPress={handleReset}
          disabled={!isPasswordPairValid(password, confirmation, mobile)}
          loading={loading}
        />
      }
    >
      <Text style={styles.subtitle}>Choose a password you have not used recently. This signs you out on every device.</Text>
      <PasswordFields
        password={password}
        confirmation={confirmation}
        onPasswordChange={onChange(setPassword)}
        onConfirmationChange={onChange(setConfirmation)}
        error={errorFor('password')}
        mobile={mobile}
      />
      {error?.target === 'form' ? <ErrorBanner message={error.message} onRetry={error.retryable ? handleReset : undefined} /> : null}
    </AuthFormLayout>
  );
}

const styles = StyleSheet.create({
  subtitle: { ...Typography.body, color: Brand.textMuted },
});

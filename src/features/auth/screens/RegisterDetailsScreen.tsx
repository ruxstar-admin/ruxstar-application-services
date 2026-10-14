import { useState } from 'react';
import { TextInput } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AuthFormLayout } from '@/features/auth/components/AuthFormLayout';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { InputField } from '@/components/ui/InputField';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { AuthService } from '@/services/auth-service';
import { useAuthStore } from '@/stores/auth-store';
import { useAuthRequest } from '@/features/auth/hooks/use-auth-request';
import { MIN_PASSWORD_LENGTH, passwordError } from '@/features/auth/lib/validators';
import { ROLES } from '@/constants/roles';
import { Feedback } from '@/lib/haptics';
import { useDelayedFocus } from '@/hooks/use-delayed-focus';

export function RegisterDetailsScreen() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const { signupToken } = useLocalSearchParams<{ signupToken: string; mobile: string }>();
  const nameRef = useDelayedFocus<TextInput>();
  const { run, loading, error, clearError } = useAuthRequest();

  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [confirmTouched, setConfirmTouched] = useState(false);

  const passwordsMatch = password.length >= MIN_PASSWORD_LENGTH && password === confirmPassword;
  const canSubmit = name.trim().length > 0 && passwordsMatch;

  const handleSubmit = async () => {
    // Role is chosen later via Profile → "Become a Vendor/Delivery Partner" (Module 5), not at signup.
    const result = await run('signup-complete', () =>
      AuthService.signupComplete(signupToken, name.trim(), password, ROLES.CUSTOMER),
    );
    if (!result) return;
    Feedback.success();
    setAuth(result.token, result.user);
  };

  const onChange = (setter: (value: string) => void) => (value: string) => {
    setter(value);
    clearError();
  };

  return (
    <AuthFormLayout
      title="Tell us about yourself"
      onBack={() => router.back()}
      actions={<PrimaryButton label="Complete setup" onPress={handleSubmit} disabled={!canSubmit} loading={loading} />}
    >
      <InputField
        ref={nameRef}
        label="Full name"
        value={name}
        onChangeText={onChange(setName)}
        placeholder="Enter your full name"
        autoComplete="name"
        textContentType="name"
        autoCapitalize="words"
        returnKeyType="next"
      />
      <InputField
        label="Password"
        value={password}
        onChangeText={onChange(setPassword)}
        onBlur={() => setPasswordTouched(true)}
        secureTextEntry
        placeholder={`Minimum ${MIN_PASSWORD_LENGTH} characters`}
        autoComplete="new-password"
        textContentType="newPassword"
        error={passwordTouched ? (passwordError(password) ?? undefined) : undefined}
      />
      <InputField
        label="Confirm password"
        value={confirmPassword}
        onChangeText={onChange(setConfirmPassword)}
        onBlur={() => setConfirmTouched(true)}
        secureTextEntry
        placeholder="Re-enter your password"
        autoComplete="new-password"
        textContentType="newPassword"
        error={confirmTouched && confirmPassword.length > 0 && password !== confirmPassword ? 'Passwords do not match.' : undefined}
      />
      {error ? <ErrorBanner message={error.message} onRetry={error.retryable ? handleSubmit : undefined} /> : null}
    </AuthFormLayout>
  );
}

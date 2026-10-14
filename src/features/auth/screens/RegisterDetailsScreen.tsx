import { useState } from 'react';
import { StyleSheet, Text, TextInput } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Brand, Typography } from '@/constants/theme';
import { AuthFormLayout } from '@/features/auth/components/AuthFormLayout';
import { InputField } from '@/components/ui/InputField';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { AuthService } from '@/services/auth-service';
import { useAuthStore } from '@/stores/auth-store';
import { ApiError } from '@/lib/api-error';
import { ROLES } from '@/constants/roles';
import { Feedback } from '@/lib/haptics';
import { useDelayedFocus } from '@/hooks/use-delayed-focus';

export function RegisterDetailsScreen() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const { signupToken } = useLocalSearchParams<{ signupToken: string; mobile: string }>();
  const nameRef = useDelayedFocus<TextInput>();

  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const passwordsMatch = password.length >= 6 && password === confirmPassword;
  const canSubmit = name.trim().length > 0 && passwordsMatch;

  const handleSubmit = async () => {
    setError(null);
    setLoading(true);
    try {
      // Role is chosen later via Profile → "Become a Vendor/Delivery Partner" (Module 5), not at signup.
      const { token, user } = await AuthService.signupComplete(signupToken, name.trim(), password, ROLES.CUSTOMER);
      Feedback.success();
      setAuth(token, user);
    } catch (err) {
      Feedback.error();
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthFormLayout
      title="Tell us about yourself"
      onBack={() => router.back()}
      actions={<PrimaryButton label="Complete setup" onPress={handleSubmit} disabled={!canSubmit} loading={loading} />}
    >
      <InputField ref={nameRef} label="Full name" value={name} onChangeText={setName} placeholder="Enter your full name" />
      <InputField
        label="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        placeholder="Minimum 6 characters"
      />
      <InputField
        label="Confirm password"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
        placeholder="Re-enter your password"
        error={confirmPassword.length > 0 && !passwordsMatch ? 'Passwords do not match' : undefined}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </AuthFormLayout>
  );
}

const styles = StyleSheet.create({
  error: { ...Typography.caption, color: Brand.error },
});

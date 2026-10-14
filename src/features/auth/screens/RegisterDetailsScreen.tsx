import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Brand, Spacing, Typography } from '@/constants/theme';
import { InputField } from '@/components/ui/InputField';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { AuthService } from '@/services/auth-service';
import { useAuthStore } from '@/stores/auth-store';
import { ApiError } from '@/lib/api-error';
import { ROLES } from '@/constants/roles';
import { useDelayedFocus } from '@/hooks/use-delayed-focus';

export function RegisterDetailsScreen() {
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
      setAuth(token, user);
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
          <Text style={styles.title}>Tell us about yourself</Text>

          <InputField
            ref={nameRef}
            label="Full name"
            value={name}
            onChangeText={setName}
            placeholder="Enter your full name"
          />
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

          <PrimaryButton label="Complete setup" onPress={handleSubmit} disabled={!canSubmit} loading={loading} />
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
    marginBottom: Spacing.two,
  },
  error: {
    ...Typography.caption,
    color: Brand.error,
  },
});

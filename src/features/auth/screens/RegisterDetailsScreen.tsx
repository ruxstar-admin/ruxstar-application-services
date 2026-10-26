import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AuthFormLayout } from '@/features/auth/components/AuthFormLayout';
import { PasswordFields } from '@/features/auth/components/PasswordFields';
import { UsernameField } from '@/features/auth/components/UsernameField';
import { Checkbox } from '@/components/ui/Checkbox';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { InputField } from '@/components/ui/InputField';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { TextLink } from '@/components/ui/TextLink';
import { AccountService } from '@/services/account-service';
import { AuthService } from '@/services/auth-service';
import { useAuthStore } from '@/stores/auth-store';
import { useAuthRequest } from '@/features/auth/hooks/use-auth-request';
import { useUsernameCheck } from '@/features/auth/hooks/use-username-check';
import { CONSENT_VERSION } from '@/features/auth/lib/consent';
import { isPasswordPairValid } from '@/features/auth/lib/validators';
import { ROLES } from '@/constants/roles';
import { Brand, Spacing, Typography } from '@/constants/theme';
import { Feedback } from '@/lib/haptics';
import { createLogger } from '@/lib/logger';
import { useDelayedFocus } from '@/hooks/use-delayed-focus';

const log = createLogger('signup');

export function RegisterDetailsScreen() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const { signupToken } = useLocalSearchParams<{ signupToken: string; mobile: string }>();
  const nameRef = useDelayedFocus<TextInput>();
  const { run, loading, error, clearError } = useAuthRequest();

  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [consent, setConsent] = useState(false);
  const usernameCheck = useUsernameCheck(username);

  const canSubmit =
    name.trim().length > 0 && usernameCheck.status === 'available' && isPasswordPairValid(password, confirmation) && consent;

  const handleSubmit = async () => {
    // Role is chosen later via Profile → "Become a Vendor/Delivery Partner", not at signup.
    const result = await run('signup-complete', () =>
      AuthService.signupComplete(signupToken, name.trim(), password, ROLES.CUSTOMER),
    );
    if (!result) return;

    // Username and consent have no backend route yet (mocked). Failing to save them must not strand a created account.
    const saved = await Promise.allSettled([
      AccountService.setUsername(result.token, username),
      AccountService.acceptConsent(result.token, CONSENT_VERSION),
    ]);
    saved.forEach((outcome) => outcome.status === 'rejected' && log.warn('post-signup profile save failed'));

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
      <UsernameField value={username} onChange={onChange(setUsername)} check={usernameCheck} />
      <PasswordFields
        password={password}
        confirmation={confirmation}
        onPasswordChange={onChange(setPassword)}
        onConfirmationChange={onChange(setConfirmation)}
      />
      <Checkbox checked={consent} onChange={setConsent} accessibilityLabel="Agree to the Terms of Service and Privacy Policy">
        <Text style={styles.consent}>I agree to the </Text>
        <View style={styles.links}>
          <TextLink muted label="Terms of Services" onPress={() => undefined} />
          <Text style={styles.consent}> and </Text>
          <TextLink muted label="Privacy Policy" onPress={() => undefined} />
        </View>
      </Checkbox>
      {error ? <ErrorBanner message={error.message} onRetry={error.retryable ? handleSubmit : undefined} /> : null}
    </AuthFormLayout>
  );
}

const styles = StyleSheet.create({
  consent: { ...Typography.caption, color: Brand.textMuted },
  links: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginTop: Spacing.half },
});

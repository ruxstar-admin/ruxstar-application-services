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
import { SegmentedTabs } from '@/components/ui/SegmentedTabs';
import { TextLink } from '@/components/ui/TextLink';
import { AuthService } from '@/services/auth-service';
import { useAuthStore } from '@/stores/auth-store';
import { useAuthRequest } from '@/features/auth/hooks/use-auth-request';
import { useUsernameCheck } from '@/features/auth/hooks/use-username-check';
import {
  dobError,
  dobToIso,
  formatDobInput,
  isOldEnough,
  isPasswordPairValid,
  isValidEmail,
  isValidName,
  nameError,
} from '@/features/auth/lib/validators';
import { Brand, Spacing, Typography } from '@/constants/theme';
import { Feedback } from '@/lib/haptics';
import { setPendingLoginRoute } from '@/lib/pending-login-route';
import { useDelayedFocus } from '@/hooks/use-delayed-focus';
import type { Gender } from '@/types/profile';

const GENDERS = [
  { key: 'female', label: 'Female' },
  { key: 'male', label: 'Male' },
  { key: 'other', label: 'Other' },
] as const;

/** Signup details after the number is verified (Architecture decision 33). Photo waits for file uploads. */
export function RegisterDetailsScreen() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const { verificationToken, mobile } = useLocalSearchParams<{ verificationToken: string; mobile: string }>();
  const nameRef = useDelayedFocus<TextInput>();
  const { run, loading, error, errorFor, clearError } = useAuthRequest();

  const [name, setName] = useState('');
  const [dobText, setDobText] = useState('');
  const [gender, setGender] = useState<Gender | undefined>();
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [consent, setConsent] = useState(false);
  const [nameTouched, setNameTouched] = useState(false);
  const usernameCheck = useUsernameCheck(username, name);

  const dob = dobToIso(dobText);
  const canSubmit =
    isValidName(name) &&
    !!dob &&
    isOldEnough(dob) &&
    !!gender &&
    isValidEmail(email.trim()) &&
    usernameCheck.status === 'available' &&
    isPasswordPairValid(password, confirmation, mobile) &&
    consent;

  const handleSubmit = async () => {
    if (!dob || !gender) return;
    const result = await run('signup-complete', () =>
      AuthService.signup({
        verificationToken,
        name: name.trim(),
        dob,
        gender,
        email: email.trim() || undefined,
        username,
        password,
      }),
    );
    if (!result) return;
    Feedback.success();
    setPendingLoginRoute('/(customer)/welcome');
    setAuth(result.tokens, result.user);
  };

  const onChange = (setter: (value: string) => void) => (value: string) => {
    setter(value);
    clearError();
  };

  return (
    <AuthFormLayout
      title="Tell us about yourself"
      onBack={() => router.back()}
      actions={<PrimaryButton label="Create account" onPress={handleSubmit} disabled={!canSubmit} loading={loading} />}
    >
      <InputField
        ref={nameRef}
        label="Full name"
        value={name}
        onChangeText={onChange(setName)}
        onBlur={() => setNameTouched(true)}
        placeholder="Enter your full name"
        autoComplete="name"
        textContentType="name"
        autoCapitalize="words"
        returnKeyType="next"
        error={errorFor('name') ?? (nameTouched ? (nameError(name) ?? undefined) : undefined)}
      />
      <InputField
        label="Date of birth"
        value={dobText}
        onChangeText={(text) => onChange(setDobText)(formatDobInput(text))}
        placeholder="DD/MM/YYYY"
        keyboardType="number-pad"
        autoComplete="birthdate-full"
        maxLength={10}
        hint="You need to be 13 or older. Never shown on your profile."
        error={errorFor('dob') ?? dobError(dobText) ?? undefined}
      />
      <View style={styles.group}>
        <Text style={styles.label}>Gender</Text>
        <SegmentedTabs
          options={GENDERS}
          value={gender}
          onChange={(value) => {
            setGender(value);
            clearError();
          }}
        />
      </View>
      <InputField
        label="Email (optional)"
        value={email}
        onChangeText={onChange(setEmail)}
        placeholder="you@example.com"
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        textContentType="emailAddress"
        error={errorFor('email') ?? (email.trim() && !isValidEmail(email.trim()) ? 'Enter a valid email address.' : undefined)}
      />
      <PasswordFields
        password={password}
        confirmation={confirmation}
        onPasswordChange={onChange(setPassword)}
        onConfirmationChange={onChange(setConfirmation)}
        error={errorFor('password')}
        mobile={mobile}
      />
      <UsernameField value={username} onChange={onChange(setUsername)} check={usernameCheck} error={errorFor('username')} />
      <Checkbox checked={consent} onChange={setConsent} accessibilityLabel="Agree to the Terms of Service and Privacy Policy">
        <Text style={styles.consent}>I agree to the </Text>
        <View style={styles.links}>
          <TextLink muted label="Terms of Services" onPress={() => undefined} />
          <Text style={styles.consent}> and </Text>
          <TextLink muted label="Privacy Policy" onPress={() => undefined} />
        </View>
      </Checkbox>
      {error?.target === 'form' ? <ErrorBanner message={error.message} onRetry={error.retryable ? handleSubmit : undefined} /> : null}
    </AuthFormLayout>
  );
}

const styles = StyleSheet.create({
  group: { gap: Spacing.two },
  label: { ...Typography.caption, color: Brand.textMuted },
  consent: { ...Typography.caption, color: Brand.textMuted },
  links: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginTop: Spacing.half },
});

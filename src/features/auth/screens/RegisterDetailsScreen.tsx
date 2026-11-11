import { useRef, useState } from 'react';
import { Keyboard, StyleSheet, Text, View, type LayoutChangeEvent, type ScrollView, type TextInput } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AuthFormLayout } from '@/features/auth/components/AuthFormLayout';
import { DateOfBirthField, type DateOfBirthFieldHandle } from '@/features/auth/components/DateOfBirthField';
import { PasswordFields } from '@/features/auth/components/PasswordFields';
import { UsernameField } from '@/features/auth/components/UsernameField';
import { Checkbox } from '@/components/ui/Checkbox';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { FieldFrame } from '@/components/ui/FieldFrame';
import { InputField } from '@/components/ui/InputField';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { SegmentedTabs } from '@/components/ui/SegmentedTabs';
import { TextLink } from '@/components/ui/TextLink';
import { AuthService } from '@/services/auth-service';
import { useAuthStore } from '@/stores/auth-store';
import { useAuthRequest } from '@/features/auth/hooks/use-auth-request';
import { useUsernameCheck } from '@/features/auth/hooks/use-username-check';
import { MAX_NAME_LENGTH, MIN_AGE_YEARS, isOldEnough, isValidEmail, nameError, passwordError, usernameError } from '@/features/auth/lib/validators';
import { Brand, Spacing, Typography } from '@/constants/theme';
import { Feedback } from '@/lib/haptics';
import { openLegal } from '@/lib/legal';
import { setPendingLoginRoute } from '@/lib/pending-login-route';
import { useDelayedFocus } from '@/hooks/use-delayed-focus';
import type { Gender } from '@/types/profile';

const GENDERS = [
  { key: 'female', label: 'Female' },
  { key: 'male', label: 'Male' },
  { key: 'other', label: 'Other' },
] as const;

/** Top to bottom, the order the screen checks and scrolls to after a submit. */
const FIELDS = ['name', 'username', 'dob', 'gender', 'email', 'password', 'confirmation', 'consent'] as const;
type Field = (typeof FIELDS)[number];

/** After focusing, wait for the layout's own keyboard scroll so ours lands last. */
const REVEAL_AFTER_MS = 120;

/**
 * Signup details after the number is verified (Architecture decision 33). Photo waits for file uploads.
 * Create account always responds: with something missing it marks every problem and scrolls to the first.
 */
export function RegisterDetailsScreen() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const { verificationToken, mobile } = useLocalSearchParams<{ verificationToken: string; mobile: string }>();
  const { run, loading, error, errorFor, clearError } = useAuthRequest();

  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [dob, setDob] = useState<string | null>(null);
  const [gender, setGender] = useState<Gender | undefined>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [consent, setConsent] = useState(false);
  const [nameTouched, setNameTouched] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [inUsername, setInUsername] = useState(false);
  const usernameCheck = useUsernameCheck(username, name, inUsername);

  const scrollRef = useRef<ScrollView>(null);
  const positions = useRef<Partial<Record<Field, number>>>({});
  const nameRef = useDelayedFocus<TextInput>();
  const usernameRef = useRef<TextInput>(null);
  const dobRef = useRef<DateOfBirthFieldHandle>(null);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmationRef = useRef<TextInput>(null);

  const problems: Record<Field, string | null> = {
    name: name.trim() ? nameError(name) : 'Enter your full name.',
    username: !username
      ? 'Choose a username.'
      : (usernameError(username) ?? (usernameCheck.status === 'available' ? null : 'Pick a username that is available.')),
    dob: !dob ? 'Choose your date of birth.' : isOldEnough(dob) ? null : `You need to be at least ${MIN_AGE_YEARS} years old.`,
    gender: gender ? null : 'Choose one.',
    email: isValidEmail(email.trim()) ? null : 'Enter a valid email address.',
    password: password ? passwordError(password, mobile) : 'Choose a password.',
    confirmation: confirmation && confirmation === password ? null : 'Re-enter the same password.',
    consent: consent ? null : 'Agree to the terms to create your account.',
  };

  const place = (field: Field, e: LayoutChangeEvent) => {
    positions.current[field] = e.nativeEvent.layout.y;
  };

  /** Scrolls the field into view; types into it straight away only when the keyboard is already up. */
  const reveal = (field: Field) => {
    const inputs: Partial<Record<Field, React.RefObject<TextInput | null>>> = {
      name: nameRef,
      username: usernameRef,
      email: emailRef,
      password: passwordRef,
      confirmation: confirmationRef,
    };
    if (Keyboard.isVisible()) inputs[field]?.current?.focus();
    setTimeout(() => {
      const y = positions.current[field];
      if (y !== undefined) scrollRef.current?.scrollTo({ y: Math.max(0, y - Spacing.four), animated: true });
    }, REVEAL_AFTER_MS);
  };

  const handleSubmit = async () => {
    const first = FIELDS.find((field) => problems[field]);
    if (first || !dob || !gender) {
      setSubmitted(true);
      Feedback.error();
      if (first) reveal(first);
      return;
    }
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
    setPendingLoginRoute('/(customer)/add-photo');
    setAuth(result.tokens, result.user);
  };

  const onChange = (setter: (value: string) => void) => (value: string) => {
    setter(value);
    clearError();
  };

  const shown = (field: Field) => (submitted ? (problems[field] ?? undefined) : undefined);

  return (
    <AuthFormLayout
      title="Tell us about yourself"
      onBack={() => router.back()}
      scrollRef={scrollRef}
      actions={<PrimaryButton label="Create account" onPress={handleSubmit} loading={loading} />}
    >
      {mobile ? <Text style={styles.subtitle}>Your number +91 {mobile.slice(0, 5)} {mobile.slice(5)} is verified.</Text> : null}
      <View onLayout={(e) => place('name', e)}>
        <InputField
          ref={nameRef}
          label="Full name"
          value={name}
          onChangeText={onChange(setName)}
          onBlur={() => setNameTouched(true)}
          placeholder="Enter your full name"
          maxLength={MAX_NAME_LENGTH}
          autoComplete="name"
          textContentType="name"
          autoCapitalize="words"
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => usernameRef.current?.focus()}
          error={errorFor('name') ?? shown('name') ?? (nameTouched ? (nameError(name) ?? undefined) : undefined)}
        />
      </View>
      <View onLayout={(e) => place('username', e)}>
        <UsernameField
          ref={usernameRef}
          value={username}
          onChange={onChange(setUsername)}
          check={usernameCheck}
          onFocusChange={setInUsername}
          error={errorFor('username') ?? (submitted && !username ? 'Choose a username.' : undefined)}
          onSubmitEditing={() => {
            if (dob) return emailRef.current?.focus();
            Keyboard.dismiss();
            dobRef.current?.open();
          }}
        />
      </View>
      <View onLayout={(e) => place('dob', e)}>
        <DateOfBirthField
          ref={dobRef}
          value={dob}
          onChange={(value) => {
            setDob(value);
            clearError();
          }}
          hint="You need to be 13 or older. Never shown on your profile."
          error={errorFor('dob') ?? shown('dob')}
        />
      </View>
      <View onLayout={(e) => place('gender', e)}>
        <FieldFrame label="Gender" error={shown('gender')}>
          <SegmentedTabs
            options={GENDERS}
            value={gender}
            onChange={(value) => {
              setGender(value);
              clearError();
            }}
          />
        </FieldFrame>
      </View>
      <View onLayout={(e) => place('email', e)}>
        <InputField
          ref={emailRef}
          label="Email (optional)"
          value={email}
          onChangeText={onChange(setEmail)}
          placeholder="you@example.com"
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => passwordRef.current?.focus()}
          error={errorFor('email') ?? (email.trim() && !isValidEmail(email.trim()) ? 'Enter a valid email address.' : undefined)}
        />
      </View>
      <View onLayout={(e) => place('password', e)} style={styles.passwords}>
        <PasswordFields
          password={password}
          confirmation={confirmation}
          onPasswordChange={onChange(setPassword)}
          onConfirmationChange={onChange(setConfirmation)}
          error={errorFor('password')}
          mobile={mobile}
          submitted={submitted}
          passwordRef={passwordRef}
          confirmationRef={confirmationRef}
          onSubmit={handleSubmit}
        />
      </View>
      <View onLayout={(e) => place('consent', e)}>
        <FieldFrame error={shown('consent')}>
          <Checkbox checked={consent} onChange={setConsent} accessibilityLabel="Agree to the Terms of Service and Privacy Policy">
            <Text style={styles.consent}>I agree to the </Text>
            <View style={styles.links}>
              <TextLink muted label="Terms of Service" onPress={() => openLegal('terms')} />
              <Text style={styles.consent}> and </Text>
              <TextLink muted label="Privacy Policy" onPress={() => openLegal('privacy')} />
            </View>
          </Checkbox>
        </FieldFrame>
      </View>
      {error?.target === 'form' ? <ErrorBanner message={error.message} onRetry={error.retryable ? handleSubmit : undefined} /> : null}
    </AuthFormLayout>
  );
}

const styles = StyleSheet.create({
  subtitle: { ...Typography.body, color: Brand.textMuted },
  passwords: { gap: Spacing.four },
  consent: { ...Typography.caption, color: Brand.textMuted },
  links: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginTop: Spacing.half },
});

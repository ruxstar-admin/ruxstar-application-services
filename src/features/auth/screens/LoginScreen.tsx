import { useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Brand, Spacing, Typography } from '@/constants/theme';
import { AuthFormLayout } from '@/features/auth/components/AuthFormLayout';
import { PhoneInput } from '@/features/auth/components/PhoneInput';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { InputField } from '@/components/ui/InputField';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { TextLink } from '@/components/ui/TextLink';
import { AuthService } from '@/services/auth-service';
import { useAuthStore } from '@/stores/auth-store';
import { useAuthRequest } from '@/features/auth/hooks/use-auth-request';
import { MIN_PASSWORD_LENGTH, isValidMobile } from '@/features/auth/lib/validators';
import { Feedback } from '@/lib/haptics';
import { useDelayedFocus } from '@/hooks/use-delayed-focus';
import { Motion } from '@/constants/motion';

type LoginMode = 'password' | 'otp';

/** From this many wrong passwords in a row, the "Log in with OTP instead" link shakes to draw the eye. */
const FAILED_ATTEMPTS_BEFORE_NUDGE = 2;
/** When the keyboard is already open, bring the Log in button into view once the password field takes focus. */
const SCROLL_AFTER_FOCUS_MS = 120;

export function LoginScreen() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const { mobile: prefillMobile } = useLocalSearchParams<{ mobile?: string }>();
  const { run, loading, error, errorFor, clearError } = useAuthRequest();

  const [mode, setMode] = useState<LoginMode>('password');
  const [mobile, setMobile] = useState(prefillMobile ?? '');
  const [password, setPassword] = useState('');
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [nudgeKey, setNudgeKey] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  // Phone gets the delayed auto-focus unless it arrived prefilled; then the password field does.
  const focusPhone = !prefillMobile;
  const phoneRef = useDelayedFocus<TextInput>(Motion.duration.slow, focusPhone);
  const passwordRef = useDelayedFocus<TextInput>(Motion.duration.slow, !focusPhone);

  const canSubmit =
    mode === 'password' ? isValidMobile(mobile) && password.length >= MIN_PASSWORD_LENGTH : isValidMobile(mobile);

  const handleSubmit = async () => {
    if (mode === 'password') {
      const result = await run(
        'login-password',
        () => AuthService.loginWithPassword(mobile, password),
        (authError) => {
          if (authError.target !== 'password') return;
          // Clear and refocus so the user can retype immediately instead of hunting for the field.
          setPassword('');
          const attempts = failedAttempts + 1;
          setFailedAttempts(attempts);
          if (attempts >= FAILED_ATTEMPTS_BEFORE_NUDGE) setNudgeKey((k) => k + 1);
          setTimeout(() => passwordRef.current?.focus(), Motion.duration.base);
        },
      );
      if (result) {
        Feedback.success();
        setAuth(result.token, result.user);
      }
      return;
    }

    const sent = await run('login-otp-send', () => AuthService.loginSendOtp(mobile));
    if (sent) router.push({ pathname: '/(auth)/otp', params: { mode: 'login', mobile } });
  };

  const switchMode = () => {
    clearError();
    setFailedAttempts(0);
    setNudgeKey(0);
    setMode(mode === 'password' ? 'otp' : 'password');
  };

  return (
    <AuthFormLayout
      title="Welcome back"
      onBack={() => router.back()}
      scrollRef={scrollRef}
      actions={
        <PrimaryButton
          label={mode === 'password' ? 'Log in' : 'Send OTP'}
          onPress={handleSubmit}
          disabled={!canSubmit}
          loading={loading}
        />
      }
    >
      <Text style={styles.subtitle}>Sign in to continue</Text>

      <View style={styles.fields}>
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

        {mode === 'password' ? (
          <InputField
            ref={passwordRef}
            label="Password"
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              clearError();
            }}
            secureTextEntry
            placeholder="Enter your password"
            autoComplete="current-password"
            textContentType="password"
            returnKeyType="go"
            onFocus={() => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), SCROLL_AFTER_FOCUS_MS)}
            onSubmitEditing={canSubmit ? handleSubmit : undefined}
            error={errorFor('password')}
          />
        ) : null}

        <View style={styles.switchLink}>
          <TextLink
            label={mode === 'password' ? 'Log in with OTP instead' : 'Log in with password instead'}
            onPress={switchMode}
            attentionKey={nudgeKey}
          />
        </View>
      </View>

      {error?.target === 'form' ? (
        <ErrorBanner message={error.message} onRetry={error.retryable ? handleSubmit : undefined} />
      ) : null}

      <View style={styles.signupRow}>
        <Text style={styles.signupText}>New to Ruxstar? </Text>
        <TextLink muted label="Create account" onPress={() => router.replace('/(auth)/welcome')} />
      </View>
    </AuthFormLayout>
  );
}

const styles = StyleSheet.create({
  subtitle: { ...Typography.body, color: Brand.textMuted },
  fields: { gap: Spacing.three },
  switchLink: { alignSelf: 'flex-end' },
  signupRow: { flexDirection: 'row', justifyContent: 'center', marginTop: Spacing.three },
  signupText: { ...Typography.caption, color: Brand.textMuted },
});

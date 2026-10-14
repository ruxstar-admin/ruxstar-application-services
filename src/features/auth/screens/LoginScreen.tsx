import { useCallback, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Brand, Spacing, Typography } from '@/constants/theme';
import { AuthFormLayout } from '@/features/auth/components/AuthFormLayout';
import { PhoneInput } from '@/features/auth/components/PhoneInput';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { InputField } from '@/components/ui/InputField';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { TextLink } from '@/components/ui/TextLink';
import { Toast } from '@/components/ui/Toast';
import { AuthService } from '@/services/auth-service';
import { useAuthStore } from '@/stores/auth-store';
import { useAuthRequest } from '@/features/auth/hooks/use-auth-request';
import { MIN_PASSWORD_LENGTH, isValidMobile } from '@/features/auth/lib/validators';
import { Feedback } from '@/lib/haptics';
import { useDelayedFocus } from '@/hooks/use-delayed-focus';
import { Motion } from '@/constants/motion';

type LoginMode = 'password' | 'otp';

/** After this many wrong passwords in a row we nudge the user towards OTP login (toast, haptic, link shake). */
const FAILED_ATTEMPTS_BEFORE_NUDGE = 2;
/** Lets the error haptic finish so the two vibrations read as distinct. */
const NUDGE_HAPTIC_DELAY_MS = 350;
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
  const [toastVisible, setToastVisible] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const dismissToast = useCallback(() => setToastVisible(false), []);

  // Phone gets the delayed auto-focus unless it arrived prefilled; then the password field does.
  const focusPhone = !prefillMobile;
  const phoneRef = useDelayedFocus<TextInput>(Motion.duration.slow, focusPhone);
  const passwordRef = useDelayedFocus<TextInput>(Motion.duration.slow, !focusPhone);

  const canSubmit = mode === 'password' ? isValidMobile(mobile) && password.length >= MIN_PASSWORD_LENGTH : isValidMobile(mobile);

  const nudgeTowardsOtp = () => {
    setToastVisible(true);
    setNudgeKey((k) => k + 1);
    setTimeout(Feedback.warning, NUDGE_HAPTIC_DELAY_MS);
  };

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
          if (attempts >= FAILED_ATTEMPTS_BEFORE_NUDGE) nudgeTowardsOtp();
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
    setToastVisible(false);
    setMode(mode === 'password' ? 'otp' : 'password');
  };

  return (
    <AuthFormLayout
      title="Welcome back"
      onBack={() => router.back()}
      scrollRef={scrollRef}
      overlay={
        <Toast
          visible={toastVisible}
          onDismiss={dismissToast}
          message="Trouble signing in? Try logging in with an OTP instead."
        />
      }
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
              onPress={switchMode}
              attentionKey={mode === 'password' ? nudgeKey : 0}
            />
          </View>
        </>
      }
    >
      <Text style={styles.subtitle}>Sign in to continue</Text>

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
  center: { alignItems: 'center' },
  signupRow: { flexDirection: 'row', justifyContent: 'center', marginTop: Spacing.three },
  signupText: { ...Typography.caption, color: Brand.textMuted },
});

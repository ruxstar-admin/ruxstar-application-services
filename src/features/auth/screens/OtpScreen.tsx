import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Brand, Spacing, Typography } from '@/constants/theme';
import { AuthFormLayout } from '@/features/auth/components/AuthFormLayout';
import { OtpInput } from '@/features/auth/components/OtpInput';
import { Chip } from '@/components/ui/Chip';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { TextLink } from '@/components/ui/TextLink';
import { AuthService } from '@/services/auth-service';
import { useAuthStore } from '@/stores/auth-store';
import { useAuthRequest } from '@/features/auth/hooks/use-auth-request';
import { useOtpTimer } from '@/features/auth/hooks/use-otp-timer';
import { OTP_LENGTH } from '@/features/auth/lib/validators';
import { Feedback } from '@/lib/haptics';

type OtpMode = 'login' | 'signup' | 'reset';

const RESEND = {
  signup: { action: 'signup-otp-send', send: AuthService.signupSendOtp },
  login: { action: 'login-otp-send', send: AuthService.loginSendOtp },
  reset: { action: 'forgot-otp-send', send: AuthService.forgotSendOtp },
} as const;

export function OtpScreen() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const { mode, mobile } = useLocalSearchParams<{ mode: OtpMode; mobile: string }>();
  const { run, loading, error, errorFor, clearError } = useAuthRequest();
  const { secondsLeft, canResend, restart } = useOtpTimer();

  const [otp, setOtp] = useState('');

  const verify = async (code: string) => {
    if (mode === 'signup') {
      const result = await run(
        'otp-verify',
        () => AuthService.signupVerifyOtp(mobile, code),
        () => setOtp(''),
      );
      if (!result) return;
      Feedback.success();
      router.push({ pathname: '/(auth)/register', params: { signupToken: result.signupToken, mobile } });
      return;
    }

    if (mode === 'reset') {
      const result = await run(
        'otp-verify',
        () => AuthService.forgotVerifyOtp(mobile, code),
        () => setOtp(''),
      );
      if (!result) return;
      Feedback.success();
      router.replace({ pathname: '/(auth)/reset-password', params: { resetToken: result.resetToken, mobile } });
      return;
    }

    const result = await run(
      'otp-verify',
      () => AuthService.loginVerifyOtp(mobile, code),
      () => setOtp(''),
    );
    if (!result) return;
    Feedback.success();
    setAuth(result.token, result.user);
  };

  const handleChange = (value: string) => {
    setOtp(value);
    clearError();
    // Submit as soon as the last digit lands (typed, pasted, or SMS-autofilled).
    if (value.length === OTP_LENGTH) verify(value);
  };

  const handleResend = async () => {
    if (!canResend) return;
    const sent = await run(RESEND[mode].action, () => RESEND[mode].send(mobile));
    if (sent) restart();
  };

  const countdown = `0:${secondsLeft.toString().padStart(2, '0')}`;
  const otpError = errorFor('otp');

  return (
    <AuthFormLayout
      title="OTP Verification"
      onBack={() => router.back()}
      actions={
        <>
          <PrimaryButton
            label="Continue"
            onPress={() => verify(otp)}
            disabled={otp.length !== OTP_LENGTH}
            loading={loading}
          />
          <View style={styles.center}>
            <TextLink label="Back to login" onPress={() => router.back()} />
          </View>
        </>
      }
    >
      <Text style={styles.subtitle}>
        We have sent a verification code to{'\n'}+91 {mobile}
      </Text>

      <View>
        <OtpInput value={otp} onChangeText={handleChange} autoFocus hasError={!!otpError} />
        <View style={styles.errorSlot} accessibilityLiveRegion="polite">
          {otpError ? (
            <View style={styles.errorRow}>
              <Ionicons name="alert-circle" size={14} color={Brand.error} />
              <Text style={styles.errorText}>{otpError}</Text>
            </View>
          ) : null}
        </View>
      </View>

      {error?.target === 'form' ? (
        <ErrorBanner message={error.message} onRetry={error.retryable && otp.length === OTP_LENGTH ? () => verify(otp) : undefined} />
      ) : null}

      <View style={styles.resend}>
        <Text style={styles.resendLabel} maxFontSizeMultiplier={1.3}>
          {'Didn’t get the OTP?'}
          {!canResend ? <Text style={styles.countdown}>{`  (Request again in ${countdown}s)`}</Text> : null}
        </Text>
        <Chip
          label="SMS"
          disabled={!canResend}
          onPress={handleResend}
          icon={
            <Ionicons name="chatbox-ellipses-outline" size={18} color={canResend ? Brand.text : Brand.disabledText} />
          }
        />
      </View>
    </AuthFormLayout>
  );
}

const styles = StyleSheet.create({
  subtitle: { ...Typography.heading, fontFamily: Typography.body.fontFamily, color: Brand.textMuted },
  errorSlot: { minHeight: 20, marginTop: Spacing.two },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  errorText: { ...Typography.caption, color: Brand.error, flex: 1 },
  resend: { gap: Spacing.three },
  resendLabel: { ...Typography.body, fontSize: 18, color: Brand.textMuted },
  countdown: { ...Typography.body, color: Brand.textFaint },
  center: { alignItems: 'center' },
});

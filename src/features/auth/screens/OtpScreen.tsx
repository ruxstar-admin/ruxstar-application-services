import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Brand, Spacing, Typography } from '@/constants/theme';
import { AuthFormLayout } from '@/features/auth/components/AuthFormLayout';
import { OtpInput } from '@/features/auth/components/OtpInput';
import { Chip } from '@/components/ui/Chip';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { TextLink } from '@/components/ui/TextLink';
import { AuthService } from '@/services/auth-service';
import { useAuthStore } from '@/stores/auth-store';
import { ApiError } from '@/lib/api-error';
import { useOtpTimer } from '@/features/auth/hooks/use-otp-timer';
import { Feedback } from '@/lib/haptics';

type OtpMode = 'login' | 'signup';

export function OtpScreen() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const { mode, mobile } = useLocalSearchParams<{ mode: OtpMode; mobile: string }>();

  const [otp, setOtp] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { secondsLeft, canResend, restart } = useOtpTimer();

  const handleVerify = async () => {
    setError(null);
    setLoading(true);
    try {
      if (mode === 'signup') {
        const { signupToken } = await AuthService.signupVerifyOtp(mobile, otp);
        Feedback.success();
        router.push({ pathname: '/(auth)/register', params: { signupToken, mobile } });
      } else {
        const { token, user } = await AuthService.loginVerifyOtp(mobile, otp);
        Feedback.success();
        setAuth(token, user);
      }
    } catch (err) {
      setOtp('');
      setError(err instanceof ApiError ? err.message : 'Invalid or expired OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!canResend) return;
    setError(null);
    try {
      if (mode === 'signup') await AuthService.signupSendOtp(mobile);
      else await AuthService.loginSendOtp(mobile);
      restart();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not resend OTP');
    }
  };

  const countdown = `0:${secondsLeft.toString().padStart(2, '0')}`;

  return (
    <AuthFormLayout
      title="OTP Verification"
      onBack={() => router.back()}
      actions={
        <>
          <PrimaryButton label="Continue" onPress={handleVerify} disabled={otp.length !== 6} loading={loading} />
          <View style={styles.center}>
            <TextLink label="Back to login" onPress={() => router.back()} />
          </View>
        </>
      }
    >
      <Text style={styles.subtitle}>
        We have sent a verification code to{'\n'}+91 {mobile}
      </Text>

      <OtpInput value={otp} onChangeText={setOtp} autoFocus hasError={!!error} />
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.resend}>
        <Text style={styles.resendLabel}>
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
  error: { ...Typography.caption, color: Brand.error },
  resend: { gap: Spacing.three },
  resendLabel: { ...Typography.body, fontSize: 18, color: Brand.textMuted },
  countdown: { ...Typography.body, color: Brand.textFaint },
  center: { alignItems: 'center' },
});

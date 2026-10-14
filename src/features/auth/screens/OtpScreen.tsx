import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Brand, Spacing, Typography } from '@/constants/theme';
import { OtpInput } from '@/features/auth/components/OtpInput';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
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

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <SafeAreaView style={styles.container}>
        <Animated.View entering={FadeInUp.duration(350)} style={styles.form}>
          <Text style={styles.title}>Verify your number</Text>
          <Text style={styles.subtitle}>We sent a 6-digit code to +91 {mobile}</Text>

          <OtpInput value={otp} onChangeText={setOtp} autoFocus hasError={!!error} />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <PrimaryButton label="Continue" onPress={handleVerify} disabled={otp.length !== 6} loading={loading} />

          <Pressable onPress={handleResend} disabled={!canResend} style={styles.resendWrap}>
            <Text style={[styles.resendText, !canResend && styles.resendTextDisabled]}>
              {canResend ? "Didn't get the code? Resend" : `Resend in 0:${secondsLeft.toString().padStart(2, '0')}`}
            </Text>
          </Pressable>
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
    gap: Spacing.four,
  },
  title: {
    ...Typography.title,
    color: Brand.text,
  },
  subtitle: {
    ...Typography.body,
    color: Brand.textMuted,
  },
  error: {
    ...Typography.caption,
    color: Brand.error,
  },
  resendWrap: {
    alignSelf: 'center',
  },
  resendText: {
    ...Typography.caption,
    color: Brand.secondary,
  },
  resendTextDisabled: {
    color: Brand.textFaint,
  },
});

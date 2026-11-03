import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { TextLink } from '@/components/ui/TextLink';
import { Brand, Spacing, Typography } from '@/constants/theme';
import { OtpInput } from '@/features/auth/components/OtpInput';
import { useOtpTimer } from '@/features/auth/hooks/use-otp-timer';
import { OTP_LENGTH } from '@/features/auth/lib/validators';
import { useAuthToken } from '@/hooks/use-auth-token';
import { ApiError } from '@/lib/api-error';
import { Feedback } from '@/lib/haptics';
import { ProfileService } from '@/services/profile-service';
import type { Profile } from '@/types/profile';

/** The API's own message, with the tries left or the wait when it gives one. */
const messageFor = (err: unknown) => {
  if (!(err instanceof ApiError)) return 'Something went wrong. Try again.';
  const detail = err.details[0]?.message;
  return (err.code === 'OTP_INVALID' || err.code === 'OTP_LIMIT') && detail ? `${err.message} ${detail}` : err.message;
};

interface EmailVerifySheetProps {
  visible: boolean;
  onClose: () => void;
  onVerified: (profile: Profile) => void;
}

/** Emails a code when it opens, then takes the 6 digits. Submits as soon as the last one lands. */
export function EmailVerifySheet({ visible, onClose, onVerified }: EmailVerifySheetProps) {
  const token = useAuthToken();
  const { secondsLeft, canResend, restart } = useOtpTimer();
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!visible || sentTo) return;
    let live = true;
    ProfileService.sendEmailCode(token)
      .then((sent) => {
        if (!live) return;
        setSentTo(sent.sentTo);
        restart();
      })
      .catch((err: unknown) => live && setError(messageFor(err)));
    return () => {
      live = false;
    };
  }, [visible, sentTo, token, restart]);

  const resend = async () => {
    setError(null);
    try {
      const sent = await ProfileService.sendEmailCode(token);
      setSentTo(sent.sentTo);
      restart();
    } catch (err) {
      setError(messageFor(err));
    }
  };

  const verify = async (value: string) => {
    setBusy(true);
    setError(null);
    try {
      const profile = await ProfileService.verifyEmail(token, value);
      Feedback.success();
      onVerified(profile);
    } catch (err) {
      setCode('');
      setError(messageFor(err));
    } finally {
      setBusy(false);
    }
  };

  const change = (value: string) => {
    setCode(value);
    setError(null);
    if (value.length === OTP_LENGTH) verify(value);
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Verify your email">
      <Text style={styles.message}>{sentTo ? `We emailed a 6-digit code to ${sentTo}.` : 'Sending a code to your email…'}</Text>
      <OtpInput value={code} onChangeText={change} autoFocus hasError={!!error} />
      <View style={styles.errorSlot} accessibilityLiveRegion="polite">
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>
      <PrimaryButton label="Verify" onPress={() => verify(code)} disabled={code.length !== OTP_LENGTH} loading={busy} />
      <View style={styles.resend}>
        {canResend ? (
          <TextLink label="Send a new code" onPress={resend} />
        ) : (
          <Text style={styles.wait}>{`Send a new code in 0:${secondsLeft.toString().padStart(2, '0')}`}</Text>
        )}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  message: { ...Typography.body, color: Brand.textMuted },
  errorSlot: { minHeight: 20 },
  error: { ...Typography.caption, color: Brand.error },
  resend: { alignItems: 'center', paddingVertical: Spacing.one },
  wait: { ...Typography.caption, color: Brand.textFaint },
});

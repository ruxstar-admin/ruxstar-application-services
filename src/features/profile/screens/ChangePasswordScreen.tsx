import { useRef, useState } from 'react';
import { StyleSheet, Text, View, type TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { InputField } from '@/components/ui/InputField';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Brand, Spacing, Typography } from '@/constants/theme';
import { PasswordFields } from '@/features/auth/components/PasswordFields';
import { isPasswordPairValid } from '@/features/auth/lib/validators';
import { useAuthToken } from '@/hooks/use-auth-token';
import { ApiError } from '@/lib/api-error';
import { Feedback } from '@/lib/haptics';
import { ProfileService } from '@/services/profile-service';
import { useAuthStore } from '@/stores/auth-store';

/** Needs the current password. The API signs out every other device; this one stays signed in. */
export function ChangePasswordScreen() {
  const router = useRouter();
  const token = useAuthToken();
  const mobile = useAuthStore((s) => s.mobile) ?? undefined;
  const currentRef = useRef<TextInput>(null);
  const [current, setCurrent] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [currentError, setCurrentError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  const ready = current.length > 0 && isPasswordPairValid(password, confirmation, mobile);

  const save = async () => {
    if (!ready || saving) return;
    setSaving(true);
    setCurrentError(null);
    setPasswordError(null);
    setFailure(null);
    try {
      await ProfileService.changePassword(token, current, password);
      Feedback.success();
      setDone(true);
    } catch (err) {
      Feedback.error();
      if (err instanceof ApiError && err.code === 'INVALID_CREDENTIALS') {
        setCurrentError('That password is not right.');
        currentRef.current?.focus();
      } else if (err instanceof ApiError && (err.code === 'PASSWORD_REUSED' || err.code === 'VALIDATION_FAILED')) {
        setPasswordError(err.code === 'PASSWORD_REUSED' ? 'Choose a password you have not used recently.' : err.message);
      } else {
        setFailure(err instanceof ApiError ? err.message : 'Could not change your password. Please try again.');
      }
    } finally {
      setSaving(false);
    }
  };

  if (done) {
    return (
      <ScreenContainer title="Change password" footer={<PrimaryButton label="Done" onPress={() => router.back()} />}>
        <View style={styles.done} accessibilityLiveRegion="polite">
          <Ionicons name="checkmark-circle" size={48} color={Brand.success} />
          <Text style={styles.doneTitle}>Password changed</Text>
          <Text style={styles.subtitle}>Other devices are signed out. This one stays signed in.</Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer
      title="Change password"
      footer={<PrimaryButton label="Change password" onPress={save} disabled={!ready} loading={saving} />}
    >
      <Text style={styles.subtitle}>Other devices will be signed out. This one stays signed in.</Text>
      <InputField
        ref={currentRef}
        label="Current password"
        value={current}
        onChangeText={(value) => {
          setCurrent(value);
          setCurrentError(null);
        }}
        secureTextEntry
        autoComplete="current-password"
        textContentType="password"
        returnKeyType="next"
        error={currentError ?? undefined}
      />
      <PasswordFields
        label="New password"
        password={password}
        confirmation={confirmation}
        onPasswordChange={(value) => {
          setPassword(value);
          setPasswordError(null);
        }}
        onConfirmationChange={setConfirmation}
        error={passwordError ?? undefined}
        mobile={mobile}
        onSubmit={save}
      />
      {failure ? <ErrorBanner message={failure} onRetry={save} /> : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  subtitle: { ...Typography.body, color: Brand.textMuted },
  done: { alignItems: 'center', gap: Spacing.two, paddingTop: Spacing.five },
  doneTitle: { ...Typography.title, color: Brand.text },
});

import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { ConfirmSheet } from '@/components/ui/ConfirmSheet';
import { InputField } from '@/components/ui/InputField';
import { ListRow } from '@/components/ui/ListRow';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Brand, Spacing, Typography } from '@/constants/theme';
import { useAuthToken } from '@/hooks/use-auth-token';
import { ApiError } from '@/lib/api-error';
import { Feedback } from '@/lib/haptics';
import { ProfileService } from '@/services/profile-service';
import { useAuthStore } from '@/stores/auth-store';

export function AccountDataScreen() {
  const token = useAuthToken();
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const [pausing, setPausing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const exportData = async () => {
    setNotice(null);
    try {
      const { message } = await ProfileService.exportData(token);
      Feedback.success();
      setNotice(message);
    } catch {
      Feedback.error();
      setNotice('Could not start the export. Please try again.');
    }
  };

  const pause = async () => {
    setBusy(true);
    try {
      await ProfileService.pauseAccount(token);
      Feedback.success();
      clearAuth();
    } catch {
      Feedback.error();
      setBusy(false);
      setPausing(false);
      setNotice('That did not go through. Please try again.');
    }
  };

  const closeDelete = () => {
    setDeleting(false);
    setPassword('');
    setPasswordError(null);
  };

  const remove = async () => {
    setBusy(true);
    setPasswordError(null);
    try {
      await ProfileService.deleteAccount(token, password);
      Feedback.success();
      clearAuth();
    } catch (err) {
      Feedback.error();
      setBusy(false);
      if (err instanceof ApiError && err.code === 'INVALID_CREDENTIALS') {
        setPasswordError('That password is not right.');
        return;
      }
      closeDelete();
      setNotice('That did not go through. Please try again.');
    }
  };

  return (
    <ScreenContainer title="Account & data">
      <ListRow icon="download-outline" title="Export my data" subtitle="We email you a copy within 24 hours" onPress={exportData} />
      <ListRow icon="pause-circle-outline" title="Pause account" subtitle="Hide your profile until you return" onPress={() => setPausing(true)} />
      <ListRow icon="trash-outline" title="Delete account" destructive onPress={() => setDeleting(true)} />
      {notice ? <Text style={styles.notice}>{notice}</Text> : null}

      <ConfirmSheet
        visible={pausing}
        title="Pause your account?"
        message="Your profile and posts are hidden until you log in again. Nothing is deleted."
        confirmLabel="Pause account"
        loading={busy}
        onConfirm={pause}
        onCancel={() => setPausing(false)}
      />

      <BottomSheet visible={deleting} onClose={busy ? () => undefined : closeDelete} title="Delete your account?">
        <Text style={styles.message}>
          This schedules permanent deletion of your profile and posts. Open orders and payouts must be settled first.
        </Text>
        <InputField
          label="Your password"
          value={password}
          onChangeText={(text) => {
            setPassword(text);
            setPasswordError(null);
          }}
          secureTextEntry
          autoComplete="current-password"
          textContentType="password"
          returnKeyType="done"
          onSubmitEditing={() => password && remove()}
          error={passwordError ?? undefined}
        />
        <PrimaryButton label="Delete account" onPress={remove} disabled={!password} loading={busy} />
        <PrimaryButton label="Cancel" variant="outline" onPress={closeDelete} disabled={busy} />
      </BottomSheet>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  message: { ...Typography.body, color: Brand.textMuted },
  notice: { ...Typography.caption, color: Brand.textMuted, marginTop: Spacing.three },
});

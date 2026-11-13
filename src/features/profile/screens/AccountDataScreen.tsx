import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { BottomSheet } from '@/components/ui/BottomSheet';
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
  const [deleting, setDeleting] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

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
      <ListRow icon="download-outline" title="Export my data" subtitle="A copy of everything, by email" soon />
      <ListRow icon="pause-circle-outline" title="Pause account" subtitle="Hide your profile until you return" soon />
      <ListRow icon="trash-outline" title="Delete account" destructive onPress={() => setDeleting(true)} />
      {notice ? <Text style={styles.notice}>{notice}</Text> : null}

      <BottomSheet visible={deleting} onClose={busy ? () => undefined : closeDelete} title="Delete your account?">
        <Text style={styles.message}>This schedules permanent deletion of your profile and posts.</Text>
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

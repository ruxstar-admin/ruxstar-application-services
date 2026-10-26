import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { ConfirmSheet } from '@/components/ui/ConfirmSheet';
import { ListRow } from '@/components/ui/ListRow';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Brand, Spacing, Typography } from '@/constants/theme';
import { useAuthToken } from '@/hooks/use-auth-token';
import { Feedback } from '@/lib/haptics';
import { ProfileService } from '@/services/profile-service';
import { useAuthStore } from '@/stores/auth-store';

type Action = 'pause' | 'delete';

const COPY: Record<Action, { title: string; message: string; confirm: string }> = {
  pause: {
    title: 'Pause your account?',
    message: 'Your profile and posts are hidden until you log in again. Nothing is deleted.',
    confirm: 'Pause account',
  },
  delete: {
    title: 'Delete your account?',
    message: 'This schedules permanent deletion of your profile and posts. Open orders and payouts must be settled first.',
    confirm: 'Delete account',
  },
};

export function AccountDataScreen() {
  const token = useAuthToken();
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const [pending, setPending] = useState<Action | null>(null);
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

  const confirm = async () => {
    if (!pending) return;
    setBusy(true);
    try {
      await (pending === 'pause' ? ProfileService.pauseAccount(token) : ProfileService.deleteAccount(token));
      Feedback.success();
      clearAuth();
    } catch {
      Feedback.error();
      setBusy(false);
      setPending(null);
      setNotice('That did not go through. Please try again.');
    }
  };

  return (
    <ScreenContainer title="Account & data">
      <ListRow icon="download-outline" title="Export my data" subtitle="We email you a copy within 24 hours" onPress={exportData} />
      <ListRow icon="pause-circle-outline" title="Pause account" subtitle="Hide your profile until you return" onPress={() => setPending('pause')} />
      <ListRow icon="trash-outline" title="Delete account" destructive onPress={() => setPending('delete')} />
      {notice ? <Text style={styles.notice}>{notice}</Text> : null}

      <ConfirmSheet
        visible={pending !== null}
        title={pending ? COPY[pending].title : ''}
        message={pending ? COPY[pending].message : ''}
        confirmLabel={pending ? COPY[pending].confirm : ''}
        loading={busy}
        onConfirm={confirm}
        onCancel={() => setPending(null)}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  notice: { ...Typography.caption, color: Brand.textMuted, marginTop: Spacing.three },
});

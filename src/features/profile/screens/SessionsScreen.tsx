import { useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { AsyncBoundary } from '@/components/ui/AsyncBoundary';
import { Badge } from '@/components/ui/Badge';
import { ConfirmSheet } from '@/components/ui/ConfirmSheet';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { ListRow } from '@/components/ui/ListRow';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Brand, Spacing, Typography } from '@/constants/theme';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { useAuthToken } from '@/hooks/use-auth-token';
import { Feedback } from '@/lib/haptics';
import { ProfileService } from '@/services/profile-service';
import type { Session } from '@/types/profile';

/** Every device signed in. Another device is signed out only after you confirm, and you hear how it went. */
export function SessionsScreen() {
  const token = useAuthToken();
  const { data, loading, error, reload, setData } = useAsyncResource(() => ProfileService.getSessions(token));
  const [ending, setEnding] = useState<Session | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [failed, setFailed] = useState<string | null>(null);

  const ask = (session: Session) => {
    Feedback.tap();
    setNotice(null);
    setFailed(null);
    setEnding(session);
  };

  const endSession = async () => {
    if (!ending) return;
    setBusy(true);
    try {
      await ProfileService.endSession(token, ending.id);
      Feedback.success();
      setData((list) => (list ?? []).filter((session) => session.id !== ending.id));
      setNotice(`${ending.device} is signed out.`);
    } catch {
      Feedback.error();
      setFailed(`${ending.device} wasn't signed out. Check your connection and try again.`);
    } finally {
      setBusy(false);
      setEnding(null);
    }
  };

  return (
    <ScreenContainer title="Sessions & devices">
      {failed ? <ErrorBanner message={failed} /> : null}
      {notice ? <Text style={styles.notice}>{notice}</Text> : null}
      <AsyncBoundary loading={loading} error={error} hasData={!!data} onRetry={reload}>
        {data?.map((session) => (
          <ListRow
            key={session.id}
            icon="phone-portrait-outline"
            title={session.device}
            subtitle={session.lastActive}
            right={
              session.current ? (
                <Badge label="This device" tone="success" />
              ) : (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Sign out ${session.device}`}
                  hitSlop={8}
                  onPress={() => ask(session)}
                  style={({ pressed }) => pressed && styles.pressed}
                >
                  <Text style={styles.signOut}>Sign out</Text>
                </Pressable>
              )
            }
            onPress={session.current ? undefined : () => ask(session)}
          />
        ))}
        {data?.length === 0 ? <EmptyState icon="phone-portrait-outline" title="No other sessions" /> : null}
      </AsyncBoundary>

      <ConfirmSheet
        visible={!!ending}
        title="Sign out this device?"
        message={ending ? `${ending.device} will need a password or a one-time code to sign in again.` : ''}
        confirmLabel="Sign out"
        loading={busy}
        onConfirm={endSession}
        onCancel={() => !busy && setEnding(null)}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  notice: { ...Typography.caption, color: Brand.success, marginBottom: Spacing.two },
  signOut: { ...Typography.bodyStrong, fontSize: 14, color: Brand.error },
  pressed: { opacity: 0.6 },
});

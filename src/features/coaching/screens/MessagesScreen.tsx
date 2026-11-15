import { useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { AsyncBoundary } from '@/components/ui/AsyncBoundary';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { InputField } from '@/components/ui/InputField';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { dayText, timeText } from '@/features/events/lib/events';
import { errorText, isOffline } from '@/features/events/lib/messages';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { useAuthToken } from '@/hooks/use-auth-token';
import { newIdempotencyKey } from '@/lib/api-client';
import { Feedback } from '@/lib/haptics';
import { CoachingService, TeachService } from '@/services/coaching-service';

const MAX_TEXT = 1000;

/** Notices from the institute to a batch, newest first. The owner and coaches with the permission write them; everyone in the batch is told. */
export function MessagesScreen({ source }: { source: 'order' | 'batch' }) {
  const token = useAuthToken();
  const { id } = useLocalSearchParams<{ id: string }>();
  const messages = useAsyncResource(
    () => (source === 'order' ? CoachingService.messages(token, id) : TeachService.messages(token, id)).then((p) => p.items),
    `${source}:${id}`,
  );
  const batch = useAsyncResource(() => (source === 'batch' ? TeachService.batch(token, id) : Promise.resolve(null)), `${source}:${id}`);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const attempt = useRef(newIdempotencyKey());
  const canWrite = !!batch.data?.can.message;

  const send = async () => {
    if (!text.trim()) return;
    setBusy(true);
    setFailure(null);
    try {
      const sent = await TeachService.sendMessage(token, id, text.trim(), { idempotencyKey: attempt.current });
      Feedback.success();
      messages.setData((now) => [sent, ...(now ?? [])]);
      setText('');
      attempt.current = newIdempotencyKey();
    } catch (err) {
      Feedback.error();
      setFailure(errorText(err));
      if (!isOffline(err)) attempt.current = newIdempotencyKey();
    } finally {
      setBusy(false);
    }
  };

  const list = messages.data ?? [];
  return (
    <ScreenContainer title={batch.data ? batch.data.name : 'Messages'}>
      {canWrite ? (
        <View style={styles.compose}>
          <InputField
            label="Message the batch"
            value={text}
            onChangeText={setText}
            maxLength={MAX_TEXT}
            multiline
            showCount
            placeholder="Like “Bring your geometry box on Friday”"
            hint="Every student and parent in the batch gets a notification."
          />
          {failure ? <ErrorBanner message={failure} /> : null}
          <PrimaryButton label="Send" loading={busy} disabled={!text.trim()} onPress={send} />
        </View>
      ) : null}
      <AsyncBoundary loading={messages.loading} error={messages.error} hasData={!!messages.data} onRetry={messages.reload} skeletonRows={4}>
        {list.length ? (
          list.map((m) => (
            <View key={m.id} style={styles.message}>
              <Text style={styles.meta}>{`${m.author} · ${dayText(m.at)}, ${timeText(m.at)}`}</Text>
              <Text style={styles.text}>{m.text}</Text>
            </View>
          ))
        ) : (
          <EmptyState icon="megaphone-outline" title="No messages yet" message={canWrite ? 'Write to the whole batch above.' : 'Notices from the institute show up here.'} />
        )}
      </AsyncBoundary>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  compose: { gap: Spacing.two, marginBottom: Spacing.two },
  message: { gap: Spacing.one, padding: Spacing.three, borderRadius: Radius.lg, backgroundColor: Brand.surface, borderWidth: 1, borderColor: Brand.border },
  meta: { ...Typography.caption, color: Brand.textMuted },
  text: { ...Typography.body, fontSize: 15, lineHeight: 22, color: Brand.text },
});

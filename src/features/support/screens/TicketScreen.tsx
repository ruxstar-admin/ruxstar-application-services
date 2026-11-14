import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import type { ImagePickerAsset } from 'expo-image-picker';
import { AsyncBoundary } from '@/components/ui/AsyncBoundary';
import { Badge } from '@/components/ui/Badge';
import { ConfirmSheet } from '@/components/ui/ConfirmSheet';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { TextLink } from '@/components/ui/TextLink';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { useRefetchOnFocus } from '@/hooks/use-refetch-on-focus';
import { newIdempotencyKey } from '@/lib/api-client';
import { Feedback } from '@/lib/haptics';
import { SupportService } from '@/services/support-service';
import type { TicketDetail } from '@/types/support';
import { MessageBubble, PickedPhotos } from '../components/parts';
import { useSupportSession } from '../hooks/use-support-session';
import { attachPhotos, pickPhotos } from '../lib/photos';
import { CATEGORY_LABEL, PHOTOS_MAX, STATUS, TEXT_MAX, reopenLine, supportErrorText } from '../lib/support';

/** While the thread is open, it checks for a reply this often. */
const POLL_MS = 30_000;

function Composer({ ticket, token, onSent }: { ticket: TicketDetail; token: string; onSent: (next: TicketDetail) => void }) {
  const [text, setText] = useState('');
  const [photos, setPhotos] = useState<ImagePickerAsset[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const key = useRef(newIdempotencyKey());

  const addPhotos = async () => {
    const picked = await pickPhotos(PHOTOS_MAX - photos.length);
    if (picked.length) setPhotos((prev) => [...prev, ...picked].slice(0, PHOTOS_MAX));
  };

  const send = async () => {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setError(null);
    try {
      let next = await SupportService.reply(token, ticket.id, body, key.current);
      key.current = newIdempotencyKey();
      setText('');
      onSent(next);
      try {
        next = await attachPhotos(token, next, photos);
        onSent(next);
      } catch {
        setError('Your message was sent, but a photo did not upload. Send it again in a new message.');
      }
      setPhotos([]);
      Feedback.success();
    } catch (err) {
      Feedback.error();
      setError(supportErrorText(err));
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={styles.composer}>
      {error ? <ErrorBanner message={error} /> : null}
      {photos.length ? <PickedPhotos photos={photos} onAdd={addPhotos} onRemove={(i) => setPhotos((prev) => prev.filter((_, j) => j !== i))} disabled={sending} /> : null}
      <View style={styles.inputRow}>
        {photos.length < PHOTOS_MAX ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Add a photo" onPress={addPhotos} disabled={sending} hitSlop={8} style={styles.iconButton}>
            <Ionicons name="image-outline" size={22} color={Brand.textMuted} />
          </Pressable>
        ) : null}
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder={ticket.status === 'resolved' ? 'Reply to reopen' : 'Write a reply'}
          placeholderTextColor={Brand.textFaint}
          multiline
          maxLength={TEXT_MAX}
          editable={!sending}
          accessibilityLabel="Reply"
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Send"
          onPress={send}
          disabled={!text.trim() || sending}
          hitSlop={8}
          style={[styles.send, (!text.trim() || sending) && styles.sendOff]}
        >
          <Ionicons name="arrow-up" size={20} color={Brand.onAction} />
        </Pressable>
      </View>
    </View>
  );
}

/** One help ticket: the conversation with the Ruxstar team, a reply box, and "Mark as solved". */
export function TicketScreen({ id }: { id: string }) {
  const router = useRouter();
  const { token, routes } = useSupportSession();
  const { data, loading, error, reload, setData } = useAsyncResource(() => SupportService.get(token, id), id);
  useRefetchOnFocus(reload);
  const scroll = useRef<ScrollView>(null);
  const [confirming, setConfirming] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const resolveKey = useRef(newIdempotencyKey());
  const closed = data?.status === 'closed';

  useEffect(() => {
    if (closed) return;
    const timer = setInterval(reload, POLL_MS);
    return () => clearInterval(timer);
  }, [closed, reload]);

  const resolve = async () => {
    setResolving(true);
    setFailure(null);
    try {
      setData(await SupportService.resolve(token, id, resolveKey.current));
      resolveKey.current = newIdempotencyKey();
      Feedback.success();
      setConfirming(false);
    } catch (err) {
      Feedback.error();
      setFailure(supportErrorText(err));
      setConfirming(false);
    } finally {
      setResolving(false);
    }
  };

  const reopen = data ? reopenLine(data.status, data.reopenUntil) : null;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={styles.flex} behavior="padding">
        <View style={styles.pad}>
          <ScreenHeader title={data?.number ?? 'Ticket'} onBack={() => router.back()} />
        </View>
        <ScrollView
          ref={scroll}
          style={styles.flex}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: false })}
        >
          <AsyncBoundary loading={loading} error={error} hasData={!!data} onRetry={reload} skeletonRows={4}>
            {data ? (
              <>
                <View style={styles.head}>
                  <View style={styles.flex}>
                    <Text style={styles.subject}>{data.subject}</Text>
                    <Text style={styles.muted}>{[CATEGORY_LABEL[data.category], data.context?.label].filter(Boolean).join(' · ')}</Text>
                  </View>
                  <Badge label={STATUS[data.status].label} tone={STATUS[data.status].tone} />
                </View>
                {failure ? <ErrorBanner message={failure} /> : null}
                <View style={styles.thread}>
                  {data.messages.map((m) => (
                    <MessageBubble key={m.id} text={m.text} photos={m.photos} at={m.at} mine={m.mine} author={m.from === 'staff' ? 'Ruxstar support' : undefined} />
                  ))}
                </View>
                {data.status === 'open' ? <Text style={styles.note}>The Ruxstar team will reply here. We will let you know when they do.</Text> : null}
                {reopen ? <Text style={styles.note}>{reopen}</Text> : null}
                {data.status === 'open' || data.status === 'waiting' ? (
                  <View style={styles.solved}>
                    <TextLink label="My problem is solved" onPress={() => setConfirming(true)} />
                  </View>
                ) : null}
              </>
            ) : null}
          </AsyncBoundary>
        </ScrollView>
        {data && !closed ? <Composer ticket={data} token={token} onSent={setData} /> : null}
        {data && closed ? (
          <View style={styles.footer}>
            <PrimaryButton
              label="Open a new ticket"
              onPress={() =>
                router.replace(
                  routes.create({
                    category: data.category,
                    ...(data.context ? { contextType: data.context.type, contextId: data.context.id, contextLabel: data.context.label } : {}),
                  }),
                )
              }
            />
          </View>
        ) : null}
      </KeyboardAvoidingView>

      <ConfirmSheet
        visible={confirming}
        title="Mark as solved?"
        message="You can still reply to reopen it for 7 days."
        confirmLabel="Mark as solved"
        loading={resolving}
        onConfirm={resolve}
        onCancel={() => setConfirming(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: Brand.bg },
  pad: { paddingHorizontal: Spacing.three },
  content: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.four, gap: Spacing.three },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.three },
  subject: { ...Typography.heading, color: Brand.text },
  muted: { ...Typography.caption, color: Brand.textMuted, marginTop: 2 },
  thread: { gap: Spacing.three },
  note: { ...Typography.caption, color: Brand.textMuted, textAlign: 'center' },
  solved: { alignItems: 'center' },
  footer: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.three, paddingTop: Spacing.two },
  composer: { gap: Spacing.two, paddingHorizontal: Spacing.three, paddingTop: Spacing.two, paddingBottom: Spacing.three, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Brand.border },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.two },
  iconButton: { width: 40, height: 44, alignItems: 'center', justifyContent: 'center' },
  input: {
    flex: 1,
    ...Typography.body,
    color: Brand.text,
    maxHeight: 140,
    minHeight: 44,
    paddingHorizontal: Spacing.three,
    paddingTop: 11,
    paddingBottom: 11,
    borderRadius: Radius.lg,
    backgroundColor: Brand.surfaceAlt,
  },
  send: { width: 44, height: 44, borderRadius: 22, backgroundColor: Brand.action, alignItems: 'center', justifyContent: 'center' },
  sendOff: { backgroundColor: Brand.disabled },
});

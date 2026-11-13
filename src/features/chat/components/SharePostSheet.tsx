import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '@/components/ui/Avatar';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { ListRow } from '@/components/ui/ListRow';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { useAuthToken } from '@/hooks/use-auth-token';
import { newIdempotencyKey } from '@/lib/api-client';
import { ApiError } from '@/lib/api-error';
import { Feedback } from '@/lib/haptics';
import { ChatService } from '@/services/chat-service';
import type { Chat, Contact } from '@/types/chat';

interface SharePostSheetProps {
  /** The post to send; the sheet shows while it is set. */
  postId: string | null;
  onClose: () => void;
  /** The phone's own share sheet, with a link to the post. */
  onShareLink: () => void;
}

type Target = { key: string; title: string; subtitle: string; avatarUrl?: string; group: boolean; send: () => Promise<unknown> };
type SendState = 'sending' | 'sent' | 'waiting' | 'failed';

const DEBOUNCE_MS = 300;

/** Send a post into a chat: your recent chats, or anyone you search for. */
export function SharePostSheet({ postId, onClose, onShareLink }: SharePostSheetProps) {
  const token = useAuthToken();
  const [query, setQuery] = useState('');
  const [chats, setChats] = useState<Chat[] | null>(null);
  const [people, setPeople] = useState<{ q: string; list: Contact[] } | null>(null);
  const [states, setStates] = useState<Record<string, SendState>>({});
  const q = query.trim();

  const reset = () => {
    setQuery('');
    setStates({});
    setPeople(null);
  };
  const close = () => {
    reset();
    onClose();
  };
  const shareLink = () => {
    reset();
    onShareLink();
  };

  useEffect(() => {
    if (!postId) return;
    ChatService.list(token, 'chats')
      .then((page) => setChats(page.items))
      .catch(() => setChats([]));
  }, [postId, token]);

  useEffect(() => {
    if (!postId || !q) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      ChatService.contacts(token, q)
        .then((list) => !cancelled && setPeople({ q, list }))
        .catch(() => !cancelled && setPeople({ q, list: [] }));
    }, DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [postId, q, token]);

  const toChat = (chatId: string) => ChatService.send(token, chatId, { postId: postId! }, newIdempotencyKey());

  const targets: Target[] | null = q
    ? people?.q === q
      ? people.list.map((p) => ({
          key: `user:${p.id}`,
          title: p.name || p.username,
          subtitle: `@${p.username}`,
          avatarUrl: p.avatarUrl,
          group: false,
          send: async () => toChat((await ChatService.startDm(token, p.id)).id),
        }))
      : null
    : (chats?.map((c) => ({
        key: `chat:${c.id}`,
        title: c.title,
        subtitle: c.kind === 'group' ? `${c.members} people` : c.peer ? `@${c.peer.username}` : '',
        avatarUrl: c.peer?.avatarUrl,
        group: c.kind === 'group',
        send: () => toChat(c.id),
      })) ?? null);

  const send = async (target: Target) => {
    if (states[target.key] === 'sending' || states[target.key] === 'sent') return;
    setStates((prev) => ({ ...prev, [target.key]: 'sending' }));
    try {
      await target.send();
      Feedback.success();
      setStates((prev) => ({ ...prev, [target.key]: 'sent' }));
    } catch (err) {
      Feedback.error();
      const waiting = err instanceof ApiError && err.code === 'CHAT_REQUEST_PENDING';
      setStates((prev) => ({ ...prev, [target.key]: waiting ? 'waiting' : 'failed' }));
    }
  };

  return (
    <BottomSheet visible={postId !== null} onClose={close} title="Send to">
      <View style={styles.searchBox}>
        <Ionicons name="search" size={20} color={Brand.textMuted} />
        <TextInput
          style={styles.input}
          value={query}
          onChangeText={setQuery}
          placeholder="Search people"
          placeholderTextColor={Brand.textFaint}
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel="Search people"
        />
      </View>

      <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
        {targets === null ? (
          <ActivityIndicator color={Brand.primarySoft} style={styles.loading} />
        ) : targets.length === 0 ? (
          <Text style={styles.empty}>{q ? 'No one found.' : 'No chats yet. Search for someone.'}</Text>
        ) : (
          targets.map((target) => {
            const state = states[target.key];
            return (
              <View key={target.key} style={styles.row}>
                {target.group ? (
                  <View style={styles.groupIcon}>
                    <Ionicons name="people" size={18} color={Brand.primarySoft} />
                  </View>
                ) : (
                  <Avatar name={target.title} uri={target.avatarUrl} size={40} />
                )}
                <View style={styles.text}>
                  <Text style={styles.title} numberOfLines={1}>
                    {target.title}
                  </Text>
                  <Text style={styles.subtitle} numberOfLines={1}>
                    {state === 'waiting' ? 'Waiting for them to accept your request' : state === 'failed' ? 'Not sent. Tap Send to try again.' : target.subtitle}
                  </Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={state === 'sent' ? `Sent to ${target.title}` : `Send to ${target.title}`}
                  disabled={state === 'sending' || state === 'sent' || state === 'waiting'}
                  onPress={() => send(target)}
                  style={[styles.send, (state === 'sent' || state === 'waiting') && styles.sendDone]}
                >
                  {state === 'sending' ? (
                    <ActivityIndicator size="small" color={Brand.onAction} />
                  ) : (
                    <Text style={[styles.sendText, (state === 'sent' || state === 'waiting') && styles.sendDoneText]}>{state === 'sent' ? 'Sent' : 'Send'}</Text>
                  )}
                </Pressable>
              </View>
            );
          })
        )}
      </ScrollView>

      <ListRow icon="share-outline" title="Share link" subtitle="Other apps" onPress={shareLink} />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    height: 44,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.pill,
    backgroundColor: Brand.surfaceAlt,
  },
  input: { flex: 1, ...Typography.body, color: Brand.text, paddingVertical: 0 },
  list: { maxHeight: 320 },
  loading: { marginVertical: Spacing.four },
  empty: { ...Typography.caption, color: Brand.textMuted, textAlign: 'center', marginVertical: Spacing.four },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingVertical: Spacing.two },
  groupIcon: { width: 40, height: 40, borderRadius: Radius.pill, backgroundColor: 'rgba(180,92,242,0.14)', alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1 },
  title: { ...Typography.body, color: Brand.text },
  subtitle: { ...Typography.caption, color: Brand.textMuted },
  send: { minWidth: 72, height: 34, borderRadius: Radius.pill, backgroundColor: Brand.action, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.three },
  sendDone: { backgroundColor: Brand.surfaceAlt },
  sendText: { ...Typography.caption, color: Brand.onAction, fontFamily: Typography.bodyStrong.fontFamily },
  sendDoneText: { color: Brand.textMuted },
});

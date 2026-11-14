import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Skeleton } from '@/components/ui/Skeleton';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { Composer } from '@/features/chat/components/Composer';
import { MessageBubble } from '@/features/chat/components/MessageBubble';
import { MessageMenu } from '@/features/chat/components/MessageMenu';
import { TypingBubble } from '@/features/chat/components/TypingBubble';
import { useThread, type Recording } from '@/features/chat/hooks/use-thread';
import { seenMessageId } from '@/features/chat/lib/merge-messages';
import { activeLabel, layoutThread, type ThreadRow } from '@/features/chat/lib/thread-layout';
import { PhotoViewer } from '@/features/social/components/PhotoViewer';
import { useAuthToken } from '@/hooks/use-auth-token';
import { ApiError } from '@/lib/api-error';
import { Feedback } from '@/lib/haptics';
import { useOpenChat } from '@/lib/open-chat';
import { ChatService } from '@/services/chat-service';
import type { ChatDetail, ChatPhoto, PendingMessage } from '@/types/chat';

const noticeOf = (chat: ChatDetail | null) => {
  if (!chat || chat.canSend) return null;
  return chat.waiting ? `You can send more once ${chat.title} accepts your request.` : "You can't message this account.";
};

const rowKey = (row: ThreadRow) => row.message.idempotencyKey ?? row.message.id;

/** The time now, moving on each minute, so "Active 5m ago" stays right while the chat is open. */
function useMinute() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);
  return now;
}

const failureOf = (err: unknown) =>
  err instanceof ApiError && err.code !== 'INTERNAL' && err.message ? err.message : 'Could not open the chat. Please try again.';

function ThreadHeader({ title, subtitle, live, icon, onInfo }: { title: string; subtitle: string; live?: boolean; icon: ReactNode; onInfo?: () => void }) {
  const router = useRouter();
  return (
    <View style={styles.header}>
      <Pressable accessibilityRole="button" accessibilityLabel="Back" hitSlop={12} onPress={() => router.back()}>
        <Ionicons name="chevron-back" size={26} color={Brand.text} />
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={`${title}, chat details`} onPress={onInfo} style={styles.headerMain} disabled={!onInfo}>
        {icon}
        <View style={styles.headerText}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={[styles.subtitle, live && styles.subtitleLive]} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </Pressable>
      {onInfo ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Chat details" hitSlop={12} onPress={onInfo}>
          <Ionicons name="information-circle-outline" size={24} color={Brand.text} />
        </Pressable>
      ) : null}
    </View>
  );
}

function ThreadSkeleton() {
  return (
    <View style={styles.skeletons}>
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} width={i % 2 ? '55%' : '70%'} height={44} radius={16} style={i % 2 ? styles.mine : undefined} />
      ))}
    </View>
  );
}

/**
 * Opened from someone's profile (`chat/with/[userId]`): shows who straight away while the API finds your chat with them,
 * or starts it, then becomes the chat.
 */
function StartChat({ userId, name, username, avatarUrl }: { userId: string; name: string; username?: string; avatarUrl?: string }) {
  const token = useAuthToken();
  const [chat, setChat] = useState<ChatDetail | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let live = true;
    ChatService.startDm(token, userId).then(
      (started) => live && setChat(started),
      (err) => {
        if (!live) return;
        Feedback.error();
        setFailure(failureOf(err));
      },
    );
    return () => {
      live = false;
    };
  }, [token, userId, attempt]);

  if (chat) return <ChatThread id={chat.id} titleParam={chat.title} initial={chat} />;
  return (
    <SafeAreaView style={styles.container}>
      <ThreadHeader title={name} subtitle={username ? `@${username}` : ''} icon={<Avatar name={name} uri={avatarUrl || undefined} size={36} />} />
      {failure ? (
        <EmptyState
          icon="cloud-offline-outline"
          title="Could not open this chat"
          message={failure}
          actionLabel="Try again"
          onAction={() => {
            setFailure(null);
            setAttempt((n) => n + 1);
          }}
        />
      ) : (
        <ThreadSkeleton />
      )}
    </SafeAreaView>
  );
}

/** A chat by its id, or (from a profile) with a person, started if needed. */
export function ThreadScreen() {
  const { id, userId, title, username, avatar } = useLocalSearchParams<{ id?: string; userId?: string; title?: string; username?: string; avatar?: string }>();
  if (userId) return <StartChat userId={userId} name={title ?? ''} username={username} avatarUrl={avatar} />;
  return <ChatThread id={id!} titleParam={title} />;
}

/** A chat. Newest message at the bottom (inverted list); tap a photo to see it full screen, hold a message for its menu. */
function ChatThread({ id, titleParam, initial }: { id: string; titleParam?: string; initial?: ChatDetail }) {
  const router = useRouter();
  const token = useAuthToken();
  const thread = useThread(id, initial);
  useOpenChat(id);
  const { chat } = thread;
  const [menuFor, setMenuFor] = useState<PendingMessage | null>(null);
  const [viewing, setViewing] = useState<number | null>(null);
  const [cameraOff, setCameraOff] = useState(false);
  const [deciding, setDeciding] = useState<'accept' | 'decline' | null>(null);
  const [replyingTo, setReplyingTo] = useState<PendingMessage | null>(null);
  const now = useMinute();
  // Messages newer than what was there when the chat opened slide in; the history doesn't.
  const [openedWith, setOpenedWith] = useState<string | null>(null);
  if (openedWith === null && !thread.loading) setOpenedWith(thread.messages.at(-1)?.createdAt ?? '');

  const isGroup = chat?.kind === 'group';
  const seenId = chat?.kind === 'dm' ? seenMessageId(thread.messages, chat.seenAt) : null;
  const openPost = useCallback((postId: string) => router.push({ pathname: '/(customer)/post/[id]', params: { id: postId } }), [router]);

  const photos = useMemo(() => thread.messages.flatMap((m) => (m.photo ? [m.photo] : [])), [thread.messages]);
  const openPhoto = useCallback(
    (photo: ChatPhoto) => {
      Feedback.tap();
      setViewing(Math.max(0, photos.indexOf(photo)));
    },
    [photos],
  );
  const openMenu = useCallback((message: PendingMessage) => {
    Feedback.press();
    setMenuFor(message);
  }, []);

  // The thread's actions change every render; the bubbles get stable ones that call the latest.
  const latest = useRef(thread);
  useLayoutEffect(() => {
    latest.current = thread;
  });
  const retry = useCallback((message: PendingMessage) => latest.current.retry(message), []);
  const react = useCallback((message: PendingMessage, emoji: string) => {
    Feedback.select();
    latest.current.react(message, emoji);
  }, []);
  const reply = useCallback((message: PendingMessage) => {
    Feedback.press();
    setReplyingTo(message);
  }, []);
  const canRespond = chat?.state === 'active' && chat.canSend;

  const renderItem = useCallback(
    ({ item }: { item: ThreadRow }) => (
      <MessageBubble
        message={item.message}
        header={item.header}
        position={item.position}
        showAuthor={isGroup}
        seen={item.message.id === seenId}
        fresh={!!item.message.sendState || (openedWith !== null && item.message.createdAt > openedWith)}
        canRespond={canRespond}
        onRetry={retry}
        onLongPress={openMenu}
        onReact={react}
        onReply={reply}
        onOpenPost={openPost}
        onOpenPhoto={openPhoto}
      />
    ),
    [isGroup, seenId, openedWith, canRespond, retry, openMenu, react, reply, openPost, openPhoto],
  );

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
    if (result.canceled || !result.assets[0]) return;
    Feedback.select();
    setCameraOff(false);
    thread.sendPhoto(result.assets[0], replyingTo);
    setReplyingTo(null);
  };

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    setCameraOff(!permission.granted);
    if (!permission.granted) return;
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 1 });
    if (result.canceled || !result.assets[0]) return;
    Feedback.select();
    thread.sendPhoto(result.assets[0], replyingTo);
    setReplyingTo(null);
  };

  const sendText = (text: string) => {
    thread.send(text, replyingTo);
    setReplyingTo(null);
  };

  const sendVoice = (recording: Recording) => {
    Feedback.select();
    thread.sendVoice(recording, replyingTo);
    setReplyingTo(null);
  };

  const unsend = async (message: PendingMessage) => {
    if (replyingTo?.id === message.id) setReplyingTo(null);
    if (await thread.unsend(message)) Feedback.success();
  };

  const decide = async (accept: boolean) => {
    setDeciding(accept ? 'accept' : 'decline');
    try {
      if (accept) {
        thread.setChat(await ChatService.accept(token, id));
        Feedback.success();
      } else {
        await ChatService.decline(token, id);
        router.back();
      }
    } catch {
      Feedback.error();
    } finally {
      setDeciding(null);
    }
  };

  const openInfo = () => router.push({ pathname: '/(customer)/chat/info/[id]', params: { id } });

  // An inverted list renders the first item at the bottom, so the rows are newest-first.
  const rows = useMemo(() => layoutThread(thread.messages).reverse(), [thread.messages]);
  const title = chat?.title ?? titleParam ?? '';
  const typingLine = thread.typing.length === 0 ? null : isGroup && thread.typing.length > 1 ? `${thread.typing.length} people are typing…` : isGroup ? `${thread.typing[0].name || thread.typing[0].username} is typing…` : 'typing…';
  const subtitle = !chat
    ? ''
    : (typingLine ?? (isGroup ? `${chat.members} people` : (activeLabel(chat.activeAt, now) ?? (chat.peer ? `@${chat.peer.username}` : ''))));

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={styles.flex} behavior="padding">
        <ThreadHeader
          title={title}
          subtitle={subtitle}
          live={!!typingLine}
          icon={
            chat?.kind === 'dm' ? (
              <Avatar name={title} uri={chat.peer?.avatarUrl} size={36} />
            ) : (
              <View style={styles.groupIcon}>
                <Ionicons name="people" size={18} color={Brand.primarySoft} />
              </View>
            )
          }
          onInfo={chat ? openInfo : undefined}
        />

        {thread.loading ? (
          <ThreadSkeleton />
        ) : thread.error ? (
          <EmptyState icon="cloud-offline-outline" title="Could not load this chat" actionLabel="Try again" onAction={thread.reload} />
        ) : (
          <FlatList
            inverted
            data={rows}
            keyExtractor={rowKey}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
            keyboardShouldPersistTaps="handled"
            onEndReached={thread.loadOlder}
            onEndReachedThreshold={0.3}
            ListHeaderComponent={<TypingBubble people={thread.typing} showName={isGroup} />}
            ListFooterComponent={thread.loadingOlder ? <ActivityIndicator color={Brand.primarySoft} style={styles.older} /> : null}
            ListEmptyComponent={
              // The list is inverted, and it turns its empty state back the right way up through `style`, which EmptyState doesn't take.
              <View>
                <EmptyState icon="chatbubble-ellipses-outline" title="Say hello" message="Your messages will appear here." />
              </View>
            }
          />
        )}

        {cameraOff ? <Text style={styles.cameraOff}>Camera access is off for Ruxstar. Turn it on in your phone settings to take a photo.</Text> : null}

        {chat?.state === 'request' ? (
          <View style={styles.request}>
            <Text style={styles.requestText}>
              {isGroup ? `You were invited to ${chat.title}. Join to read and reply.` : `${chat.title} wants to message you. They won't know you've seen it until you accept.`}
            </Text>
            <View style={styles.requestButtons}>
              <View style={styles.flex}>
                <PrimaryButton label="Decline" variant="outline" onPress={() => decide(false)} loading={deciding === 'decline'} disabled={!!deciding} />
              </View>
              <View style={styles.flex}>
                <PrimaryButton label={isGroup ? 'Join' : 'Accept'} onPress={() => decide(true)} loading={deciding === 'accept'} disabled={!!deciding} />
              </View>
            </View>
          </View>
        ) : chat ? (
          <Composer
            onSend={sendText}
            onPhoto={pickPhoto}
            onCamera={takePhoto}
            onVoice={sendVoice}
            onTyping={thread.noteTyping}
            replyingTo={replyingTo}
            onCancelReply={() => setReplyingTo(null)}
            notice={noticeOf(chat)}
          />
        ) : null}
      </KeyboardAvoidingView>

      <MessageMenu message={menuFor} canRespond={canRespond} onClose={() => setMenuFor(null)} onReact={react} onReply={reply} onUnsend={unsend} />
      <PhotoViewer photos={photos} index={viewing} onClose={() => setViewing(null)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: Brand.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two },
  headerMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  headerText: { flex: 1 },
  groupIcon: { width: 36, height: 36, borderRadius: Radius.pill, backgroundColor: 'rgba(180,92,242,0.14)', alignItems: 'center', justifyContent: 'center' },
  title: { ...Typography.bodyStrong, color: Brand.text },
  subtitle: { ...Typography.caption, color: Brand.textMuted },
  subtitleLive: { color: Brand.primarySoft },
  list: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.three },
  skeletons: { padding: Spacing.three, gap: Spacing.three },
  mine: { alignSelf: 'flex-end' },
  older: { marginVertical: Spacing.three },
  cameraOff: { ...Typography.caption, color: Brand.textMuted, textAlign: 'center', paddingHorizontal: Spacing.four, paddingTop: Spacing.two },
  request: {
    gap: Spacing.three,
    padding: Spacing.three,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Brand.border,
    backgroundColor: Brand.surface,
  },
  requestText: { ...Typography.caption, color: Brand.textMuted, textAlign: 'center' },
  requestButtons: { flexDirection: 'row', gap: Spacing.two },
});

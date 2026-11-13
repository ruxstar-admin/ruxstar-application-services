import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Avatar } from '@/components/ui/Avatar';
import { ConfirmSheet } from '@/components/ui/ConfirmSheet';
import { EmptyState } from '@/components/ui/EmptyState';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Skeleton } from '@/components/ui/Skeleton';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { Composer } from '@/features/chat/components/Composer';
import { MessageBubble } from '@/features/chat/components/MessageBubble';
import { useThread } from '@/features/chat/hooks/use-thread';
import { seenMessageId } from '@/features/chat/lib/merge-messages';
import { useAuthToken } from '@/hooks/use-auth-token';
import { Feedback } from '@/lib/haptics';
import { ChatService } from '@/services/chat-service';
import type { ChatDetail, PendingMessage } from '@/types/chat';

const noticeOf = (chat: ChatDetail | null) => {
  if (!chat || chat.canSend) return null;
  return chat.waiting ? `You can send more once ${chat.title} accepts your request.` : "You can't message this account.";
};

/** A chat. Newest message at the bottom (inverted list); long-press your own message to unsend it. */
export function ThreadScreen() {
  const router = useRouter();
  const token = useAuthToken();
  const { id, title: titleParam } = useLocalSearchParams<{ id: string; title?: string }>();
  const thread = useThread(id);
  const { chat } = thread;
  const [unsending, setUnsending] = useState<PendingMessage | null>(null);
  const [deciding, setDeciding] = useState<'accept' | 'decline' | null>(null);

  const isGroup = chat?.kind === 'group';
  const seenId = chat?.kind === 'dm' ? seenMessageId(thread.messages, chat.seenAt) : null;
  const openPost = useCallback((postId: string) => router.push({ pathname: '/(customer)/post/[id]', params: { id: postId } }), [router]);

  const renderItem = useCallback(
    ({ item }: { item: PendingMessage }) => (
      <MessageBubble message={item} showAuthor={isGroup} seen={item.id === seenId} onRetry={thread.retry} onLongPress={setUnsending} onOpenPost={openPost} />
    ),
    [isGroup, seenId, thread.retry, openPost],
  );

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
    if (result.canceled || !result.assets[0]) return;
    Feedback.select();
    thread.sendPhoto(result.assets[0]);
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

  // An inverted list renders the first item at the bottom, so the data is newest-first.
  const data = [...thread.messages].reverse();
  const title = chat?.title ?? titleParam ?? '';
  const subtitle = !chat ? '' : isGroup ? `${chat.members} people` : chat.peer ? `@${chat.peer.username}` : '';

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={styles.flex} behavior="padding">
        <View style={styles.header}>
          <Pressable accessibilityRole="button" accessibilityLabel="Back" hitSlop={12} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={26} color={Brand.text} />
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={`${title}, chat details`} onPress={openInfo} style={styles.headerMain} disabled={!chat}>
            {chat?.kind === 'dm' ? (
              <Avatar name={title} uri={chat.peer?.avatarUrl} size={36} />
            ) : (
              <View style={styles.groupIcon}>
                <Ionicons name="people" size={18} color={Brand.primarySoft} />
              </View>
            )}
            <View style={styles.headerText}>
              <Text style={styles.title} numberOfLines={1}>
                {title}
              </Text>
              {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
            </View>
          </Pressable>
          {chat ? (
            <Pressable accessibilityRole="button" accessibilityLabel="Chat details" hitSlop={12} onPress={openInfo}>
              <Ionicons name="information-circle-outline" size={24} color={Brand.text} />
            </Pressable>
          ) : null}
        </View>

        {thread.loading ? (
          <View style={styles.skeletons}>
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} width={i % 2 ? '55%' : '70%'} height={44} radius={16} style={i % 2 ? styles.mine : undefined} />
            ))}
          </View>
        ) : thread.error ? (
          <EmptyState icon="cloud-offline-outline" title="Could not load this chat" actionLabel="Try again" onAction={thread.reload} />
        ) : (
          <FlatList
            inverted
            data={data}
            keyExtractor={(m) => m.id}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
            keyboardShouldPersistTaps="handled"
            onEndReached={thread.loadOlder}
            onEndReachedThreshold={0.3}
            ListFooterComponent={thread.loadingOlder ? <ActivityIndicator color={Brand.primarySoft} style={styles.older} /> : null}
            ListEmptyComponent={<EmptyState icon="chatbubble-ellipses-outline" title="Say hello" message="Your messages will appear here." />}
          />
        )}

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
          <Composer onSend={thread.send} onPhoto={pickPhoto} notice={noticeOf(chat)} />
        ) : null}
      </KeyboardAvoidingView>

      <ConfirmSheet
        visible={unsending !== null}
        title="Unsend message?"
        message="It disappears for everyone in this chat."
        confirmLabel="Unsend"
        onCancel={() => setUnsending(null)}
        onConfirm={async () => {
          const message = unsending;
          setUnsending(null);
          if (message && (await thread.unsend(message))) Feedback.success();
        }}
      />
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
  list: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.three },
  skeletons: { padding: Spacing.three, gap: Spacing.three },
  mine: { alignSelf: 'flex-end' },
  older: { marginVertical: Spacing.three },
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

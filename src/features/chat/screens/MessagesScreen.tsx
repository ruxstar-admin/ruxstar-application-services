import { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { EmptyState } from '@/components/ui/EmptyState';
import { SegmentedTabs } from '@/components/ui/SegmentedTabs';
import { Skeleton } from '@/components/ui/Skeleton';
import { Brand, Spacing, Typography } from '@/constants/theme';
import { ConversationRow } from '@/features/chat/components/ConversationRow';
import { useMessagesUnread } from '@/features/chat/hooks/use-messages-unread';
import { useAuthToken } from '@/hooks/use-auth-token';
import { Feedback } from '@/lib/haptics';
import { ChatService } from '@/services/chat-service';
import type { Chat, ChatBox } from '@/types/chat';

const REFRESH_MS = 15_000;
const PAGE = 20;
const MAX_PAGE = 50;

/** One box of chats, newest message first. Refreshes on focus and every 15 seconds, keeping pages already scrolled to. */
function useChatList(box: ChatBox) {
  const token = useAuthToken();
  const [items, setItems] = useState<Chat[] | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [more, setMore] = useState(false);
  const held = useRef(0);
  const shown = useRef(box);

  useEffect(() => {
    shown.current = box;
  }, [box]);

  /** Call before switching boxes, so the old box's chats never show under the new tab. */
  const reset = () => {
    setItems(null);
    setCursor(null);
    held.current = 0;
  };

  const refresh = useCallback(() => {
    const limit = Math.min(MAX_PAGE, Math.max(PAGE, held.current));
    ChatService.list(token, box, undefined, limit)
      .then((page) => {
        if (shown.current !== box) return;
        held.current = page.items.length;
        setItems(page.items);
        setCursor(page.nextCursor);
        setFailed(false);
      })
      .catch(() => setFailed(true));
  }, [token, box]);

  useFocusEffect(
    useCallback(() => {
      refresh();
      const timer = setInterval(refresh, REFRESH_MS);
      return () => clearInterval(timer);
    }, [refresh]),
  );

  const loadMore = () => {
    if (!cursor || more) return;
    setMore(true);
    ChatService.list(token, box, cursor)
      .then((page) => {
        if (shown.current !== box) return;
        setItems((prev) => {
          const known = new Set((prev ?? []).map((c) => c.id));
          const next = [...(prev ?? []), ...page.items.filter((c) => !known.has(c.id))];
          held.current = next.length;
          return next;
        });
        setCursor(page.nextCursor);
      })
      .catch(() => undefined)
      .finally(() => setMore(false));
  };

  return { items, failed, refresh, loadMore, reset };
}

export function MessagesScreen() {
  const router = useRouter();
  const [box, setBox] = useState<ChatBox>('chats');
  const { requests } = useMessagesUnread();
  const list = useChatList(box);

  const tabs = [
    { key: 'chats' as const, label: 'Chats' },
    { key: 'requests' as const, label: requests > 0 ? `Requests (${requests})` : 'Requests' },
  ];

  const open = useCallback((c: Chat) => router.push({ pathname: '/(customer)/chat/[id]', params: { id: c.id, title: c.title } }), [router]);
  const renderItem = useCallback(({ item }: { item: Chat }) => <ConversationRow chat={item} onPress={open} />, [open]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.topBar}>
        <Text style={styles.title}>Messages</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="New chat"
          hitSlop={12}
          onPress={() => {
            Feedback.tap();
            router.push('/(customer)/chat/new');
          }}
        >
          <Ionicons name="create-outline" size={24} color={Brand.text} />
        </Pressable>
      </View>

      <View style={styles.tabs}>
        <SegmentedTabs
          options={tabs}
          value={box}
          onChange={(next) => {
            if (next === box) return;
            list.reset();
            setBox(next);
          }}
        />
      </View>

      {list.items === null ? (
        list.failed ? (
          <EmptyState icon="cloud-offline-outline" title="Could not load your chats" actionLabel="Try again" onAction={list.refresh} />
        ) : (
          <View style={styles.skeletons}>
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} height={56} radius={14} />
            ))}
          </View>
        )
      ) : (
        <FlatList
          data={list.items}
          keyExtractor={(c) => c.id}
          renderItem={renderItem}
          contentContainerStyle={styles.content}
          onEndReached={list.loadMore}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={
            box === 'chats' ? (
              <EmptyState icon="chatbubbles-outline" title="No chats yet" message="Start one with the button above, or message someone from their profile." />
            ) : (
              <EmptyState icon="mail-unread-outline" title="No requests" message="Messages and group invites from people you don't follow land here." />
            )
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Brand.bg },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.three, paddingVertical: Spacing.three },
  title: { ...Typography.title, color: Brand.text },
  tabs: { paddingHorizontal: Spacing.three },
  content: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.five },
  skeletons: { padding: Spacing.three, gap: Spacing.three },
});

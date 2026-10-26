import { useCallback, useState } from 'react';
import { FlatList, KeyboardAvoidingView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { Brand, Spacing, Typography } from '@/constants/theme';
import { Composer } from '@/features/chat/components/Composer';
import { MessageBubble } from '@/features/chat/components/MessageBubble';
import { useThread } from '@/features/chat/hooks/use-thread';
import { ReportSheet } from '@/features/moderation/components/ReportSheet';
import { useAuthToken } from '@/hooks/use-auth-token';
import { ChatService } from '@/services/chat-service';
import type { ConversationKind, PendingMessage } from '@/types/chat';

/** A conversation. Newest message at the bottom (inverted list); long-press someone else's message to report it. */
export function ThreadScreen() {
  const router = useRouter();
  const token = useAuthToken();
  const { id, title, kind, canPost, members } = useLocalSearchParams<{
    id: string;
    title: string;
    kind: ConversationKind;
    canPost: string;
    members: string;
  }>();
  const thread = useThread(id);
  const [reporting, setReporting] = useState<PendingMessage | null>(null);

  const showAuthor = kind !== 'dm';
  const renderItem = useCallback(
    ({ item }: { item: PendingMessage }) => (
      <MessageBubble message={item} showAuthor={showAuthor} onRetry={thread.retry} onLongPress={setReporting} />
    ),
    [showAuthor, thread.retry],
  );

  // An inverted list renders the last item at the bottom, so the data is newest-first.
  const data = [...thread.messages].reverse();

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={styles.flex} behavior="padding">
        <View style={styles.header}>
          <ScreenHeader title={title} onBack={() => router.back()} />
          {members ? <Text style={styles.members}>{`${Number(members).toLocaleString('en-IN')} members`}</Text> : null}
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
            ListEmptyComponent={<EmptyState icon="chatbubble-ellipses-outline" title="Say hello" message="Your messages will appear here." />}
          />
        )}

        <Composer onSend={thread.send} canPost={canPost !== 'false'} />
      </KeyboardAvoidingView>

      <ReportSheet
        visible={reporting !== null}
        onClose={() => setReporting(null)}
        title="Report message"
        subject={reporting?.author.name ?? ''}
        onReport={(reason) => (reporting ? ChatService.reportMessage(token, reporting.id, reason) : Promise.resolve())}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: Brand.bg },
  header: { paddingHorizontal: Spacing.three },
  members: { ...Typography.caption, color: Brand.textMuted, marginTop: -Spacing.two, marginLeft: 26 + Spacing.three, marginBottom: Spacing.two },
  list: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.three },
  skeletons: { padding: Spacing.three, gap: Spacing.three },
  mine: { alignSelf: 'flex-end' },
});

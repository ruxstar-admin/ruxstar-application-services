import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { AsyncBoundary } from '@/components/ui/AsyncBoundary';
import { Chip } from '@/components/ui/Chip';
import { EmptyState } from '@/components/ui/EmptyState';
import { SegmentedTabs } from '@/components/ui/SegmentedTabs';
import { Brand, Spacing, Typography } from '@/constants/theme';
import { ConversationRow } from '@/features/chat/components/ConversationRow';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { useAuthToken } from '@/hooks/use-auth-token';
import { useRefetchOnFocus } from '@/hooks/use-refetch-on-focus';
import { Feedback } from '@/lib/haptics';
import { ChatService } from '@/services/chat-service';
import type { Conversation, ConversationKind } from '@/types/chat';

const TABS = [
  { key: 'dm', label: 'Chats' },
  { key: 'group', label: 'Groups' },
  { key: 'community', label: 'Communities' },
] as const;

const EMPTY: Record<ConversationKind, { icon: keyof typeof Ionicons.glyphMap; title: string; message: string }> = {
  dm: { icon: 'chatbubbles-outline', title: 'No chats yet', message: 'Start a conversation with the button above.' },
  group: { icon: 'people-outline', title: 'No groups yet', message: 'Create a group to chat with several people at once.' },
  community: { icon: 'megaphone-outline', title: 'No communities joined', message: 'Join one below to get announcements and events.' },
};

export function MessagesScreen() {
  const router = useRouter();
  const token = useAuthToken();
  const [tab, setTab] = useState<ConversationKind>('dm');
  const chats = useAsyncResource(() => ChatService.conversations(token));
  const discover = useAsyncResource(() => ChatService.discoverCommunities(token));
  const [joining, setJoining] = useState<string | null>(null);

  const { reload: reloadChats } = chats;
  const { reload: reloadDiscover } = discover;
  useRefetchOnFocus(() => {
    reloadChats();
    reloadDiscover();
  });

  const open = (c: Conversation) =>
    router.push({
      pathname: '/(customer)/chat/[id]',
      params: { id: c.id, title: c.title, kind: c.kind, canPost: String(c.canPost), members: String(c.members ?? '') },
    });

  const join = async (c: Conversation) => {
    setJoining(c.id);
    try {
      await ChatService.joinCommunity(token, c.id);
      Feedback.success();
      reloadChats();
      reloadDiscover();
    } catch {
      Feedback.error();
    } finally {
      setJoining(null);
    }
  };

  const visible = (chats.data ?? []).filter((c) => c.kind === tab);
  const empty = EMPTY[tab];

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
        <SegmentedTabs options={TABS} value={tab} onChange={setTab} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <AsyncBoundary loading={chats.loading} error={chats.error} hasData={!!chats.data} onRetry={chats.reload}>
          {visible.map((c) => (
            <ConversationRow key={c.id} conversation={c} onPress={open} />
          ))}
          {visible.length === 0 ? <EmptyState icon={empty.icon} title={empty.title} message={empty.message} /> : null}

          {tab === 'community' && discover.data && discover.data.length > 0 ? (
            <>
              <Text style={styles.section}>Discover communities</Text>
              {discover.data.map((c) => (
                <ConversationRow
                  key={c.id}
                  conversation={c}
                  onPress={open}
                  trailing={<Chip label="Join" disabled={joining === c.id} onPress={() => join(c)} />}
                />
              ))}
            </>
          ) : null}
        </AsyncBoundary>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Brand.bg },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.three, paddingVertical: Spacing.three },
  title: { ...Typography.title, color: Brand.text },
  tabs: { paddingHorizontal: Spacing.three },
  content: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.five },
  section: { ...Typography.overline, color: Brand.textMuted, marginTop: Spacing.four },
});

import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { EmptyState } from '@/components/ui/EmptyState';
import { SegmentedTabs } from '@/components/ui/SegmentedTabs';
import { Skeleton } from '@/components/ui/Skeleton';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { PostCard } from '@/features/social/components/PostCard';
import { usePostActions } from '@/features/social/hooks/use-post-actions';
import { usePostMenu } from '@/features/social/hooks/use-post-menu';
import { useUnreadCount } from '@/features/social/hooks/use-unread-count';
import { useFeedStore } from '@/features/social/stores/feed-store';
import { useAuthToken } from '@/hooks/use-auth-token';
import { usePaginated } from '@/hooks/use-paginated';
import { Feedback } from '@/lib/haptics';
import { SocialService } from '@/services/social-service';
import type { FeedTab, Post } from '@/types/social';

const END_REACHED_THRESHOLD = 0.6;

const TABS = [
  { key: 'for_you', label: 'For you' },
  { key: 'following', label: 'Following' },
] as const satisfies readonly { key: FeedTab; label: string }[];

function FeedSkeleton() {
  return (
    <View style={styles.skeletons}>
      {[0, 1, 2].map((i) => (
        <View key={i} style={styles.skeletonCard}>
          <Skeleton width={160} height={14} />
          <Skeleton height={14} />
          <Skeleton height={180} radius={14} />
        </View>
      ))}
    </View>
  );
}

export function FeedScreen() {
  const router = useRouter();
  const token = useAuthToken();
  const [tab, setTab] = useState<FeedTab>('for_you');
  const feed = usePaginated((cursor) => SocialService.feed(token, tab, cursor));
  const { items, setItems } = feed;
  const unread = useUnreadCount();
  const dirty = useFeedStore((s) => s.dirty);
  const clearDirty = useFeedStore((s) => s.clearDirty);
  const listRef = useRef<FlatList<Post>>(null);

  // A post was created, edited or deleted on another screen: reload when the feed is shown again.
  useFocusEffect(
    useCallback(() => {
      if (!dirty) return;
      clearDirty();
      feed.refresh();
      listRef.current?.scrollToOffset({ offset: 0, animated: false });
    }, [dirty, clearDirty, feed]),
  );

  const patch = useCallback(
    (id: string, changes: Partial<Post>) => setItems((prev) => prev.map((p) => (p.id === id ? { ...p, ...changes } : p))),
    [setItems],
  );
  const { toggleLike, toggleSave } = usePostActions(patch);
  const { openMenu, sheets } = usePostMenu({ onRemoved: (post) => setItems((prev) => prev.filter((p) => p.id !== post.id)) });
  const openComments = useCallback((post: Post) => router.push({ pathname: '/(customer)/post/[id]', params: { id: post.id } }), [router]);
  const openAuthor = useCallback(
    (post: Post) => !post.mine && router.push({ pathname: '/(customer)/user/[id]', params: { id: post.author.id } }),
    [router],
  );

  // Every handler is stable, so a like re-renders only the card it changed.
  const renderItem = useCallback(
    ({ item }: { item: Post }) => (
      <PostCard post={item} onLike={toggleLike} onSave={toggleSave} onOpenComments={openComments} onOpenMenu={openMenu} onOpenAuthor={openAuthor} />
    ),
    [toggleLike, toggleSave, openComments, openMenu, openAuthor],
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.topBar}>
        <Text style={styles.wordmark}>Ruxstar</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
          hitSlop={12}
          onPress={() => {
            Feedback.tap();
            router.push('/(customer)/notifications');
          }}
        >
          <Ionicons name="notifications-outline" size={24} color={Brand.text} />
          {unread > 0 ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unread > 9 ? '9+' : unread}</Text>
            </View>
          ) : null}
        </Pressable>
      </View>
      <View style={styles.tabs}>
        <SegmentedTabs
          options={TABS}
          value={tab}
          onChange={(next) => {
            if (next === tab) return;
            setTab(next);
            feed.retry();
            listRef.current?.scrollToOffset({ offset: 0, animated: false });
          }}
        />
      </View>

      {feed.loading ? (
        <FeedSkeleton />
      ) : feed.error && items.length === 0 ? (
        <EmptyState icon="cloud-offline-outline" title="Could not load your feed" message="Check your connection and try again." actionLabel="Try again" onAction={feed.retry} />
      ) : (
        <FlatList
          ref={listRef}
          data={items}
          keyExtractor={(post) => post.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          onEndReached={feed.loadMore}
          onEndReachedThreshold={END_REACHED_THRESHOLD}
          refreshControl={<RefreshControl refreshing={feed.refreshing} onRefresh={feed.refresh} tintColor={Brand.primarySoft} />}
          ListEmptyComponent={
            tab === 'following' ? (
              <EmptyState icon="people-outline" title="No one to show yet" message="Follow people and their posts show up here, newest first." />
            ) : (
              <EmptyState icon="newspaper-outline" title="Nothing here yet" message="Be the first to post something." />
            )
          }
          ListFooterComponent={feed.loadingMore ? <ActivityIndicator color={Brand.primarySoft} style={styles.footer} /> : null}
          removeClippedSubviews
        />
      )}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Create post"
        style={styles.fab}
        onPress={() => {
          Feedback.press();
          router.push('/(customer)/create-post');
        }}
      >
        <Ionicons name="add" size={28} color={Brand.onAction} />
      </Pressable>

      {sheets}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Brand.bg },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.three, paddingVertical: Spacing.three },
  wordmark: { ...Typography.title, color: Brand.text },
  tabs: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.two },
  badge: {
    position: 'absolute',
    top: -6,
    right: -8,
    minWidth: 18,
    height: 18,
    borderRadius: Radius.pill,
    backgroundColor: Brand.error,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: { ...Typography.caption, fontSize: 11, color: Brand.text },
  list: { paddingHorizontal: Spacing.three, paddingBottom: 120 },
  footer: { paddingVertical: Spacing.three },
  skeletons: { paddingHorizontal: Spacing.three, gap: Spacing.four },
  skeletonCard: { gap: Spacing.two },
  fab: {
    position: 'absolute',
    right: Spacing.three,
    bottom: Spacing.three,
    width: 56,
    height: 56,
    borderRadius: Radius.pill,
    backgroundColor: Brand.action,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
});

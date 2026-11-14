import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { Brand, Spacing } from '@/constants/theme';
import { PostCard } from '@/features/social/components/PostCard';
import { usePostActions } from '@/features/social/hooks/use-post-actions';
import { usePostMenu } from '@/features/social/hooks/use-post-menu';
import { useLatestPosts } from '@/features/social/stores/feed-store';
import { useAuthToken } from '@/hooks/use-auth-token';
import { usePaginated } from '@/hooks/use-paginated';
import { SocialService } from '@/services/social-service';

/** Posts you saved, most recently saved first. Unsaving keeps the post on screen until you leave, so a slip is easy to undo. */
export function SavedScreen() {
  const router = useRouter();
  const token = useAuthToken();
  const list = usePaginated((cursor) => SocialService.saved(token, cursor));
  const { setItems } = list;
  const items = useLatestPosts(list.items, list.loadedAt);
  const { toggleLike, toggleSave } = usePostActions();
  const { openMenu, sheets } = usePostMenu({ onRemoved: (post) => setItems((prev) => prev.filter((p) => p.id !== post.id)) });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <ScreenHeader title="Saved" onBack={() => router.back()} />
      </View>
      {list.loading ? (
        <View style={styles.skeletons}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} height={120} radius={14} />
          ))}
        </View>
      ) : list.error && items.length === 0 ? (
        <EmptyState icon="cloud-offline-outline" title="Could not load saved posts" actionLabel="Try again" onAction={list.retry} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(post) => post.id}
          renderItem={({ item }) => (
            <PostCard
              post={item}
              onLike={toggleLike}
              onSave={toggleSave}
              onOpenComments={(p) => router.push({ pathname: '/(customer)/post/[id]', params: { id: p.id } })}
              onOpenMenu={openMenu}
              onOpenAuthor={(p) => !p.mine && router.push({ pathname: '/(customer)/user/[id]', params: { id: p.author.id } })}
            />
          )}
          contentContainerStyle={styles.list}
          onEndReached={list.loadMore}
          onEndReachedThreshold={0.6}
          refreshControl={<RefreshControl refreshing={list.refreshing} onRefresh={list.refresh} tintColor={Brand.primarySoft} />}
          ListEmptyComponent={<EmptyState icon="bookmark-outline" title="Nothing saved yet" message="Tap the bookmark on any post to keep it here." />}
          ListFooterComponent={list.loadingMore ? <ActivityIndicator color={Brand.primarySoft} style={styles.footer} /> : null}
          removeClippedSubviews
        />
      )}
      {sheets}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Brand.bg },
  header: { paddingHorizontal: Spacing.three },
  list: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.five },
  footer: { paddingVertical: Spacing.three },
  skeletons: { gap: Spacing.three, paddingHorizontal: Spacing.three },
});

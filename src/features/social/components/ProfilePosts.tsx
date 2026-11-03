import { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { EmptyState } from '@/components/ui/EmptyState';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Skeleton } from '@/components/ui/Skeleton';
import { Spacing } from '@/constants/theme';
import { PostCard } from '@/features/social/components/PostCard';
import { usePostActions } from '@/features/social/hooks/use-post-actions';
import { usePostMenu } from '@/features/social/hooks/use-post-menu';
import { useAuthToken } from '@/hooks/use-auth-token';
import { usePaginated } from '@/hooks/use-paginated';
import { SocialService } from '@/services/social-service';
import type { Post, PostKind } from '@/types/social';

interface ProfilePostsProps {
  /** Username or user id. */
  owner: string;
  kind: PostKind;
  empty: { icon: React.ComponentProps<typeof EmptyState>['icon']; title: string; message?: string; actionLabel?: string; onAction?: () => void };
}

/**
 * One profile tab of posts, inside the profile's scroll view. Pages load with "Show more" rather than
 * endless scroll, because a list inside a ScrollView cannot tell when it reaches the end.
 * Remount it (change its `key`) to reload.
 */
export function ProfilePosts({ owner, kind, empty }: ProfilePostsProps) {
  const router = useRouter();
  const token = useAuthToken();
  const list = usePaginated((cursor) => SocialService.userPosts(token, owner, kind, cursor));
  const { setItems } = list;

  const patch = useCallback(
    (id: string, changes: Partial<Post>) => setItems((prev) => prev.map((p) => (p.id === id ? { ...p, ...changes } : p))),
    [setItems],
  );
  const { toggleLike, toggleSave } = usePostActions(patch);
  const { openMenu, sheets } = usePostMenu({ onRemoved: (post) => setItems((prev) => prev.filter((p) => p.id !== post.id)) });

  if (list.loading) {
    return (
      <View style={styles.skeletons}>
        {[0, 1].map((i) => (
          <View key={i} style={styles.skeleton}>
            <Skeleton width={160} height={14} />
            <Skeleton height={14} />
            <Skeleton height={140} radius={14} />
          </View>
        ))}
      </View>
    );
  }

  if (list.error && list.items.length === 0) {
    return <EmptyState icon="cloud-offline-outline" title="Could not load posts" actionLabel="Try again" onAction={list.retry} />;
  }

  if (list.items.length === 0) return <EmptyState {...empty} />;

  return (
    <View>
      {list.items.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          onLike={toggleLike}
          onSave={toggleSave}
          onOpenComments={(p) => router.push({ pathname: '/(customer)/post/[id]', params: { id: p.id } })}
          onOpenMenu={openMenu}
          onOpenAuthor={() => undefined}
        />
      ))}
      {list.hasMore ? (
        <View style={styles.more}>
          <PrimaryButton label="Show more" variant="outline" loading={list.loadingMore} onPress={list.loadMore} />
        </View>
      ) : null}
      {sheets}
    </View>
  );
}

const styles = StyleSheet.create({
  skeletons: { gap: Spacing.four },
  skeleton: { gap: Spacing.two },
  more: { paddingTop: Spacing.three },
});

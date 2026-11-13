import { useState } from 'react';
import { Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { EmptyState } from '@/components/ui/EmptyState';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Brand, Spacing, Typography } from '@/constants/theme';
import { photoSource } from '@/features/social/lib/photo-source';
import { useAuthToken } from '@/hooks/use-auth-token';
import { usePaginated } from '@/hooks/use-paginated';
import { Feedback } from '@/lib/haptics';
import { SocialService } from '@/services/social-service';
import type { Post, PostKind } from '@/types/social';

const COLUMNS = 3;
const GAP = 2;
const SKELETON_TILES = 6;

interface ProfilePostsProps {
  /** Username or user id. */
  owner: string;
  kind: PostKind;
  empty: { icon: React.ComponentProps<typeof EmptyState>['icon']; title: string; message?: string; actionLabel?: string; onAction?: () => void };
}

function describe(post: Post) {
  const photos = post.photos.length;
  const parts = [photos > 1 ? `${photos} photos` : photos === 1 ? 'Photo' : 'Text post'];
  if (post.text) parts.push(post.text.length > 60 ? `${post.text.slice(0, 59)}…` : post.text);
  return parts.join(': ');
}

function Tile({ post, size, onPress }: { post: Post; size: number; onPress: () => void }) {
  const [cover] = post.photos;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={describe(post)}
      onPress={onPress}
      style={({ pressed }) => [styles.tile, { width: size, height: size }, pressed && styles.tilePressed]}
    >
      {cover ? (
        <Image source={photoSource(cover, size)} style={{ width: size, height: size }} contentFit="cover" transition={120} recyclingKey={cover.url} />
      ) : (
        <Text style={styles.tileText} numberOfLines={5}>
          {post.text}
        </Text>
      )}
      {post.photos.length > 1 ? <Ionicons name="albums" size={16} color={Brand.text} style={styles.many} /> : null}
    </Pressable>
  );
}

/**
 * One profile tab of posts as a grid of squares, edge to edge, inside the profile's scroll view. Tap a square to
 * open the post. Pages load with "Show more" rather than endless scroll, because a list inside a ScrollView cannot
 * tell when it reaches the end. Remount it (change its `key`) to reload.
 */
export function ProfilePosts({ owner, kind, empty }: ProfilePostsProps) {
  const router = useRouter();
  const token = useAuthToken();
  const list = usePaginated((cursor) => SocialService.userPosts(token, owner, kind, cursor));
  const [width, setWidth] = useState(0);
  const size = Math.floor((width - GAP * (COLUMNS - 1)) / COLUMNS);
  const onLayout = (e: LayoutChangeEvent) => setWidth(Math.floor(e.nativeEvent.layout.width));

  if (list.error && list.items.length === 0) {
    return <EmptyState icon="cloud-offline-outline" title="Could not load posts" actionLabel="Try again" onAction={list.retry} />;
  }
  if (!list.loading && list.items.length === 0) return <EmptyState {...empty} />;

  return (
    <View style={styles.wrap}>
      <View style={styles.grid} onLayout={onLayout}>
        {width === 0
          ? null
          : list.loading
            ? Array.from({ length: SKELETON_TILES }, (_, i) => <View key={i} style={[styles.tile, { width: size, height: size }]} />)
            : list.items.map((post) => (
                <Tile
                  key={post.id}
                  post={post}
                  size={size}
                  onPress={() => {
                    Feedback.tap();
                    router.push({ pathname: '/(customer)/post/[id]', params: { id: post.id } });
                  }}
                />
              ))}
      </View>
      {list.hasMore ? (
        <View style={styles.more}>
          <PrimaryButton label="Show more" variant="outline" loading={list.loadingMore} onPress={list.loadMore} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.three },
  // The screens around it pad their content by Spacing.three; the grid runs to the screen edges.
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP, marginHorizontal: -Spacing.three, minHeight: 1 },
  tile: { overflow: 'hidden', backgroundColor: Brand.surfaceAlt, justifyContent: 'center' },
  tilePressed: { opacity: 0.75 },
  tileText: { ...Typography.caption, color: Brand.text, padding: Spacing.two },
  many: { position: 'absolute', top: Spacing.one + 2, right: Spacing.one + 2 },
  more: { paddingTop: Spacing.one },
});

import { memo } from 'react';
import { Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Brand, Spacing, Typography } from '@/constants/theme';
import { PostImages } from '@/features/social/components/PostImages';
import { Feedback } from '@/lib/haptics';
import { compactCount, timeAgo } from '@/lib/time';
import type { Post } from '@/types/social';

interface PostCardProps {
  post: Post;
  onLike: (post: Post) => void;
  onSave: (post: Post) => void;
  onOpenComments: (post: Post) => void;
  onOpenMenu: (post: Post) => void;
  onOpenAuthor: (post: Post) => void;
}

interface ActionProps {
  icon: keyof typeof Ionicons.glyphMap;
  label?: string;
  color?: string;
  accessibilityLabel: string;
  onPress: () => void;
}

function Action({ icon, label, color = Brand.textMuted, accessibilityLabel, onPress }: ActionProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={8}
      onPress={() => {
        Feedback.select();
        onPress();
      }}
      style={styles.action}
    >
      <Ionicons name={icon} size={22} color={color} />
      {label ? <Text style={[styles.actionLabel, { color }]}>{label}</Text> : null}
    </Pressable>
  );
}

/** One feed post: author row, text, photos, and like / comment / share / save actions. Memoised for long lists. */
export const PostCard = memo(function PostCard({ post, onLike, onSave, onOpenComments, onOpenMenu, onOpenAuthor }: PostCardProps) {
  const share = () => Share.share({ message: `${post.author.name} on Ruxstar: ${post.text}` }).catch(() => undefined);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel={`Open ${post.author.name}'s profile`} style={styles.author} onPress={() => onOpenAuthor(post)}>
          <Avatar name={post.author.name} uri={post.author.avatarUrl} size={40} />
          <View style={styles.authorText}>
            <View style={styles.nameRow}>
              <Text style={styles.name} numberOfLines={1}>
                {post.author.name}
              </Text>
              {post.author.isVendor ? <Badge label="Store" tone="accent" /> : null}
            </View>
            <Text style={styles.meta}>
              @{post.author.username} · {timeAgo(post.createdAt)}
            </Text>
          </View>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Post options" hitSlop={12} onPress={() => onOpenMenu(post)}>
          <Ionicons name="ellipsis-horizontal" size={20} color={Brand.textMuted} />
        </Pressable>
      </View>

      {post.text ? <Text style={styles.text}>{post.text}</Text> : null}
      <PostImages images={post.images} />

      <View style={styles.actions}>
        <Action
          icon={post.likedByMe ? 'heart' : 'heart-outline'}
          color={post.likedByMe ? Brand.error : Brand.textMuted}
          label={compactCount(post.likes)}
          accessibilityLabel={post.likedByMe ? 'Unlike' : 'Like'}
          onPress={() => onLike(post)}
        />
        <Action icon="chatbubble-outline" label={compactCount(post.comments)} accessibilityLabel="Comments" onPress={() => onOpenComments(post)} />
        <Action icon="paper-plane-outline" accessibilityLabel="Share" onPress={share} />
        <View style={styles.spacer} />
        <Action
          icon={post.savedByMe ? 'bookmark' : 'bookmark-outline'}
          color={post.savedByMe ? Brand.primarySoft : Brand.textMuted}
          accessibilityLabel={post.savedByMe ? 'Remove from saved' : 'Save'}
          onPress={() => onSave(post)}
        />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: { gap: Spacing.three, paddingVertical: Spacing.three, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Brand.border },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.three },
  author: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.two + 2 },
  authorText: { flex: 1, gap: 2 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  name: { ...Typography.bodyStrong, color: Brand.text, flexShrink: 1 },
  meta: { ...Typography.caption, color: Brand.textMuted },
  text: { ...Typography.body, color: Brand.text },
  actions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.four },
  action: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one + 2 },
  actionLabel: { ...Typography.caption },
  spacer: { flex: 1 },
});

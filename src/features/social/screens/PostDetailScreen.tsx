import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AsyncBoundary } from '@/components/ui/AsyncBoundary';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { PostCard } from '@/features/social/components/PostCard';
import { usePostActions } from '@/features/social/hooks/use-post-actions';
import { usePostMenu } from '@/features/social/hooks/use-post-menu';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { useAuthToken } from '@/hooks/use-auth-token';
import { usePaginated } from '@/hooks/use-paginated';
import { Feedback } from '@/lib/haptics';
import { timeAgo } from '@/lib/time';
import { SocialService } from '@/services/social-service';
import type { Comment, Post } from '@/types/social';

const MAX_COMMENT = 300;

function CommentRow({ comment }: { comment: Comment }) {
  return (
    <View style={styles.comment}>
      <Avatar name={comment.author.name} size={32} />
      <View style={styles.commentBody}>
        <Text style={styles.commentMeta}>
          <Text style={styles.commentName}>{comment.author.name}</Text>
          {`  ${timeAgo(comment.createdAt)}`}
        </Text>
        <Text style={styles.commentText}>{comment.text}</Text>
      </View>
    </View>
  );
}

/** A post with its comments (paged) and a composer pinned above the keyboard. */
export function PostDetailScreen() {
  const router = useRouter();
  const token = useAuthToken();
  const { id } = useLocalSearchParams<{ id: string }>();

  const post = useAsyncResource(() => SocialService.getPost(token, id));
  const comments = usePaginated((cursor) => SocialService.comments(token, id, cursor));
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);

  const { setData } = post;
  const patch = useCallback(
    (_id: string, changes: Partial<Post>) => post.data && setData({ ...post.data, ...changes }),
    [post.data, setData],
  );
  const { toggleLike, toggleSave } = usePostActions(patch);
  const { openMenu, sheets } = usePostMenu({ onRemoved: () => router.back() });

  const send = async () => {
    const body = draft.trim();
    if (!body || sending || !post.data) return;
    setSending(true);
    try {
      const comment = await SocialService.addComment(token, id, body);
      comments.setItems((prev) => [comment, ...prev]);
      setData({ ...post.data, comments: post.data.comments + 1 });
      setDraft('');
      Feedback.success();
    } catch {
      Feedback.error();
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={styles.flex} behavior="padding">
        <View style={styles.header}>
          <ScreenHeader title="Post" onBack={() => router.back()} />
        </View>

        <AsyncBoundary loading={post.loading} error={post.error} hasData={!!post.data} onRetry={post.reload} skeletonRows={3}>
          {post.data ? (
            <FlatList
              data={comments.items}
              keyExtractor={(comment) => comment.id}
              renderItem={({ item }) => <CommentRow comment={item} />}
              contentContainerStyle={styles.list}
              keyboardShouldPersistTaps="handled"
              onEndReached={comments.loadMore}
              onEndReachedThreshold={0.5}
              ListHeaderComponent={
                <PostCard
                  post={post.data}
                  onLike={toggleLike}
                  onSave={toggleSave}
                  onOpenComments={() => undefined}
                  onOpenMenu={openMenu}
                  onOpenAuthor={(p) => !p.mine && router.push({ pathname: '/(customer)/user/[id]', params: { id: p.author.id } })}
                />
              }
              ListEmptyComponent={comments.loading ? null : <EmptyState icon="chatbubbles-outline" title="No comments yet" message="Start the conversation." />}
              ListFooterComponent={comments.loadingMore ? <ActivityIndicator color={Brand.primarySoft} style={styles.footer} /> : null}
            />
          ) : null}
        </AsyncBoundary>

        <View style={styles.composer}>
          <TextInput
            style={styles.composerInput}
            value={draft}
            onChangeText={setDraft}
            placeholder="Add a comment"
            placeholderTextColor={Brand.textFaint}
            maxLength={MAX_COMMENT}
            accessibilityLabel="Add a comment"
            returnKeyType="send"
            onSubmitEditing={send}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Send comment"
            disabled={!draft.trim() || sending}
            hitSlop={8}
            onPress={send}
          >
            <Ionicons name="send" size={22} color={draft.trim() ? Brand.primarySoft : Brand.textFaint} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
      {sheets}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: Brand.bg },
  header: { paddingHorizontal: Spacing.three },
  list: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.four },
  footer: { paddingVertical: Spacing.three },
  comment: { flexDirection: 'row', gap: Spacing.two + 2, paddingVertical: Spacing.two },
  commentBody: { flex: 1, gap: 2 },
  commentMeta: { ...Typography.caption, color: Brand.textMuted },
  commentName: { ...Typography.caption, fontFamily: Typography.bodyStrong.fontFamily, color: Brand.text },
  commentText: { ...Typography.body, color: Brand.text },
  composer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Brand.border,
    backgroundColor: Brand.surface,
  },
  composerInput: {
    flex: 1,
    ...Typography.body,
    color: Brand.text,
    height: 44,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.pill,
    backgroundColor: Brand.surfaceAlt,
  },
});

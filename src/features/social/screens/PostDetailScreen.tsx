import { useRef, useState } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AsyncBoundary } from '@/components/ui/AsyncBoundary';
import { Avatar } from '@/components/ui/Avatar';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { ConfirmSheet } from '@/components/ui/ConfirmSheet';
import { EmptyState } from '@/components/ui/EmptyState';
import { ListRow } from '@/components/ui/ListRow';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { PostCard } from '@/features/social/components/PostCard';
import { PostText } from '@/features/social/components/PostText';
import { usePostActions } from '@/features/social/hooks/use-post-actions';
import { usePostMenu } from '@/features/social/hooks/use-post-menu';
import { useFeedStore, useLatestPost } from '@/features/social/stores/feed-store';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { useAuthToken } from '@/hooks/use-auth-token';
import { usePaginated } from '@/hooks/use-paginated';
import { Feedback } from '@/lib/haptics';
import { timeAgo } from '@/lib/time';
import { SocialService } from '@/services/social-service';
import type { Author, Comment } from '@/types/social';

const MAX_COMMENT = 300;
/** The counter shows once a comment gets this close to the limit. */
const COUNTER_FROM = MAX_COMMENT - 60;
/** The comments are already on this screen. */
const stayHere = () => undefined;

interface CommentRowProps {
  comment: Comment;
  onOpenAuthor: (author: Author) => void;
  /** Set when you may edit or delete it; long-press also opens it. */
  onOptions?: (comment: Comment) => void;
}

function CommentRow({ comment, onOpenAuthor, onOptions }: CommentRowProps) {
  const openAuthor = comment.mine ? undefined : () => onOpenAuthor(comment.author);
  return (
    <Pressable
      onLongPress={onOptions ? () => onOptions(comment) : undefined}
      delayLongPress={350}
      style={({ pressed }) => [styles.comment, pressed && onOptions && styles.commentPressed]}
    >
      <Pressable accessibilityRole={openAuthor ? 'link' : undefined} accessibilityLabel={`${comment.author.name}'s profile`} disabled={!openAuthor} onPress={openAuthor}>
        <Avatar name={comment.author.name} uri={comment.author.avatarUrl} size={32} />
      </Pressable>
      <View style={styles.commentBody}>
        <Text style={styles.commentMeta}>
          <Text style={styles.commentName} onPress={openAuthor} accessibilityRole={openAuthor ? 'link' : undefined}>
            {comment.author.name}
          </Text>
          {`  ${timeAgo(comment.createdAt)}${comment.editedAt ? ' · Edited' : ''}`}
        </Text>
        <PostText text={comment.text} style={styles.commentText} />
      </View>
      {onOptions ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Comment options" style={styles.iconButton} onPress={() => onOptions(comment)}>
          <Ionicons name="ellipsis-horizontal" size={18} color={Brand.textFaint} />
        </Pressable>
      ) : null}
    </Pressable>
  );
}

/** A post with its comments (paged) and a composer pinned above the keyboard, which also edits your comments. */
export function PostDetailScreen() {
  const router = useRouter();
  const token = useAuthToken();
  const { id } = useLocalSearchParams<{ id: string }>();
  const editPost = useFeedStore((s) => s.editPost);

  const [loadedAt, setLoadedAt] = useState(0);
  const resource = useAsyncResource(async () => {
    const loaded = await SocialService.getPost(token, id);
    setLoadedAt(Date.now());
    return loaded;
  });
  const post = useLatestPost(resource.data, loadedAt);
  const comments = usePaginated((cursor) => SocialService.comments(token, id, cursor));
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [editing, setEditing] = useState<Comment | null>(null);
  const inputRef = useRef<TextInput>(null);

  const { toggleLike, toggleSave } = usePostActions();
  const { openMenu, sheets } = usePostMenu({ onRemoved: () => router.back() });
  const openProfile = (author: Author) => router.push({ pathname: '/(customer)/user/[id]', params: { id: author.id } });

  const stopEditing = () => {
    setEditing(null);
    setDraft('');
  };

  const send = async () => {
    const body = draft.trim();
    if (!body || sending || !post) return;
    setSending(true);
    try {
      if (editing) {
        const saved = await SocialService.updateComment(token, editing.id, body);
        comments.setItems((prev) => prev.map((c) => (c.id === saved.id ? saved : c)));
        setEditing(null);
      } else {
        const comment = await SocialService.addComment(token, id, body);
        comments.setItems((prev) => [comment, ...prev]);
        editPost(post.id, { comments: post.comments + 1 });
      }
      setDraft('');
      Feedback.success();
    } catch {
      Feedback.error();
    } finally {
      setSending(false);
    }
  };

  const [options, setOptions] = useState<Comment | null>(null);
  const [removing, setRemoving] = useState<Comment | null>(null);
  const [removingBusy, setRemovingBusy] = useState(false);
  const removeComment = async () => {
    if (!removing || !post) return;
    setRemovingBusy(true);
    try {
      await SocialService.deleteComment(token, removing.id);
      comments.setItems((prev) => prev.filter((c) => c.id !== removing.id));
      editPost(post.id, { comments: Math.max(0, post.comments - 1) });
      if (editing?.id === removing.id) stopEditing();
      Feedback.success();
      setRemoving(null);
    } catch {
      Feedback.error();
    } finally {
      setRemovingBusy(false);
    }
  };
  const hasOptions = (comment: Comment) => comment.mine || !!post?.mine;
  const chooseOption = (next: () => void) => {
    setOptions(null);
    next();
  };
  const remaining = MAX_COMMENT - draft.length;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={styles.flex} behavior="padding">
        <View style={styles.header}>
          <ScreenHeader title="Post" onBack={() => router.back()} />
        </View>

        <AsyncBoundary loading={resource.loading} error={resource.error} hasData={!!post} onRetry={resource.reload} skeletonRows={3}>
          {post ? (
            <FlatList
              data={comments.items}
              keyExtractor={(comment) => comment.id}
              renderItem={({ item }) => (
                <CommentRow
                  comment={item}
                  onOpenAuthor={openProfile}
                  onOptions={
                    hasOptions(item)
                      ? (c) => {
                          Feedback.press();
                          setOptions(c);
                        }
                      : undefined
                  }
                />
              )}
              contentContainerStyle={styles.list}
              keyboardShouldPersistTaps="handled"
              onEndReached={comments.loadMore}
              onEndReachedThreshold={0.5}
              ListHeaderComponent={
                <PostCard
                  post={post}
                  onLike={toggleLike}
                  onSave={toggleSave}
                  onOpenComments={stayHere}
                  onOpenMenu={openMenu}
                  onOpenAuthor={(p) => !p.mine && openProfile(p.author)}
                />
              }
              ListEmptyComponent={comments.loading ? null : <EmptyState icon="chatbubbles-outline" title="No comments yet" message="Start the conversation." />}
              ListFooterComponent={comments.loadingMore ? <ActivityIndicator color={Brand.primarySoft} style={styles.footer} /> : null}
            />
          ) : null}
        </AsyncBoundary>

        {editing ? (
          <View style={styles.editing}>
            <Ionicons name="create-outline" size={16} color={Brand.textMuted} />
            <Text style={styles.editingText}>Editing your comment</Text>
            <Pressable accessibilityRole="button" hitSlop={12} onPress={stopEditing}>
              <Text style={styles.editingCancel}>Cancel</Text>
            </Pressable>
          </View>
        ) : null}
        <View style={styles.composer}>
          <TextInput
            ref={inputRef}
            style={styles.composerInput}
            value={draft}
            onChangeText={setDraft}
            placeholder="Add a comment"
            placeholderTextColor={Brand.textFaint}
            maxLength={MAX_COMMENT}
            accessibilityLabel={editing ? 'Edit your comment' : 'Add a comment'}
            returnKeyType="send"
            onSubmitEditing={send}
          />
          {draft.length >= COUNTER_FROM ? (
            <Text style={[styles.counter, remaining <= 10 && styles.counterLow]} accessibilityLabel={`${remaining} characters left`}>
              {remaining}
            </Text>
          ) : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={editing ? 'Save comment' : 'Send comment'}
            disabled={!draft.trim() || sending}
            style={styles.iconButton}
            onPress={send}
          >
            {sending ? (
              <ActivityIndicator color={Brand.primarySoft} />
            ) : (
              <Ionicons name={editing ? 'checkmark' : 'send'} size={22} color={draft.trim() ? Brand.primarySoft : Brand.textFaint} />
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
      {sheets}
      <BottomSheet visible={!!options} onClose={() => setOptions(null)}>
        {options?.mine ? (
          <ListRow
            icon="create-outline"
            title="Edit comment"
            onPress={() =>
              chooseOption(() => {
                setEditing(options);
                setDraft(options.text);
                inputRef.current?.focus();
              })
            }
          />
        ) : null}
        <ListRow icon="trash-outline" title="Delete comment" destructive onPress={() => chooseOption(() => options && setRemoving(options))} />
      </BottomSheet>
      <ConfirmSheet
        visible={!!removing}
        title="Delete this comment?"
        message="It will be removed for everyone."
        confirmLabel="Delete"
        loading={removingBusy}
        onConfirm={removeComment}
        onCancel={() => setRemoving(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: Brand.bg },
  header: { paddingHorizontal: Spacing.three },
  list: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.four },
  footer: { paddingVertical: Spacing.three },
  comment: { flexDirection: 'row', gap: Spacing.two + 2, paddingVertical: Spacing.two, borderRadius: Radius.sm },
  commentPressed: { backgroundColor: Brand.surfaceAlt },
  commentBody: { flex: 1, gap: 2 },
  commentMeta: { ...Typography.caption, color: Brand.textMuted },
  commentName: { ...Typography.caption, fontFamily: Typography.bodyStrong.fontFamily, color: Brand.text },
  commentText: { ...Typography.body, color: Brand.text },
  iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginVertical: -Spacing.one },
  editing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Brand.border,
    backgroundColor: Brand.surface,
  },
  editingText: { ...Typography.caption, color: Brand.textMuted, flex: 1 },
  editingCancel: { ...Typography.caption, fontFamily: Typography.bodyStrong.fontFamily, color: Brand.primarySoft },
  composer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
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
  counter: { ...Typography.caption, color: Brand.textFaint },
  counterLow: { color: Brand.error },
});

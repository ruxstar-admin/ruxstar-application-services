import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { timeAgo } from '@/lib/time';
import type { PendingMessage } from '@/types/chat';

interface MessageBubbleProps {
  message: PendingMessage;
  /** Show the sender's name above other people's messages (groups). */
  showAuthor: boolean;
  /** "Seen" under it: your latest message in a 1:1 chat, once they read it. */
  seen: boolean;
  onRetry: (message: PendingMessage) => void;
  /** Long-press on your own message: unsend. */
  onLongPress: (message: PendingMessage) => void;
  onOpenPost: (postId: string) => void;
}

const PHOTO_WIDTH = 240;
const PHOTO_MAX_HEIGHT = 320;

function photoSize(width: number, height: number) {
  const w = PHOTO_WIDTH;
  const h = Math.min(PHOTO_MAX_HEIGHT, Math.round((w * height) / Math.max(1, width)));
  return { width: w, height: h };
}

/** A chat bubble: yours on the right in purple, others on the left; group lines centred. Unsent ones show their state. */
export const MessageBubble = memo(function MessageBubble({ message, showAuthor, seen, onRetry, onLongPress, onOpenPost }: MessageBubbleProps) {
  if (message.kind === 'event') {
    return <Text style={styles.event}>{message.text}</Text>;
  }

  const failed = message.sendState === 'failed';
  const photo = message.photo ?? message.upload;
  const uri = message.photo?.url ?? message.upload?.uri;
  const post = message.post;
  const meta = failed ? 'Not sent · tap to retry' : message.sendState === 'sending' ? 'Sending…' : timeAgo(message.createdAt);

  return (
    <View style={[styles.row, message.mine && styles.rowMine]}>
      <View style={[styles.column, message.mine && styles.columnMine]}>
        <Pressable
          accessibilityRole={failed ? 'button' : undefined}
          accessibilityHint={failed ? 'Double tap to retry sending' : message.mine ? 'Long press to unsend' : undefined}
          onPress={failed ? () => onRetry(message) : undefined}
          onLongPress={message.mine ? () => onLongPress(message) : undefined}
          style={[
            styles.bubble,
            message.mine ? styles.bubbleMine : styles.bubbleOther,
            photo && !message.text ? styles.bubblePhoto : null,
            message.sendState === 'sending' && styles.sending,
          ]}
        >
          {showAuthor && !message.mine && message.sender ? <Text style={styles.author}>{message.sender.name || message.sender.username}</Text> : null}

          {photo && uri ? (
            <Image source={{ uri }} style={[styles.photo, photoSize(photo.width, photo.height)]} contentFit="cover" transition={150} accessibilityLabel="Photo" />
          ) : null}

          {post ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={post.available ? `Post by ${post.author?.name ?? ''}` : 'Post unavailable'}
              disabled={!post.available}
              onPress={() => onOpenPost(post.id)}
              style={styles.post}
            >
              {post.available ? (
                <>
                  <Text style={styles.postAuthor} numberOfLines={1}>
                    {post.author?.name || post.author?.username}
                  </Text>
                  {post.photo ? <Image source={{ uri: post.photo }} style={styles.postPhoto} contentFit="cover" /> : null}
                  {post.text ? (
                    <Text style={styles.postText} numberOfLines={3}>
                      {post.text}
                    </Text>
                  ) : null}
                </>
              ) : (
                <View style={styles.postGone}>
                  <Ionicons name="eye-off-outline" size={16} color={Brand.textMuted} />
                  <Text style={styles.postGoneText}>Post unavailable</Text>
                </View>
              )}
            </Pressable>
          ) : null}

          {message.text ? <Text style={styles.text}>{message.text}</Text> : null}
          <Text style={[styles.meta, failed && styles.failed]}>{meta}</Text>
        </Pressable>
        {seen ? <Text style={styles.seen}>Seen</Text> : null}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  row: { flexDirection: 'row', marginVertical: Spacing.one },
  rowMine: { justifyContent: 'flex-end' },
  column: { maxWidth: '80%', alignItems: 'flex-start' },
  columnMine: { alignItems: 'flex-end' },
  bubble: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.two + 2, borderRadius: Radius.lg, gap: Spacing.one },
  bubbleMine: { backgroundColor: Brand.primaryDeep, borderBottomRightRadius: Radius.sm },
  bubbleOther: { backgroundColor: Brand.surfaceAlt, borderBottomLeftRadius: Radius.sm },
  bubblePhoto: { padding: Spacing.one },
  sending: { opacity: 0.6 },
  author: { ...Typography.caption, color: Brand.primarySoft, fontFamily: Typography.bodyStrong.fontFamily },
  text: { ...Typography.body, color: Brand.text },
  photo: { borderRadius: Radius.md, backgroundColor: Brand.surface },
  post: { width: PHOTO_WIDTH, borderRadius: Radius.md, backgroundColor: 'rgba(0,0,0,0.18)', padding: Spacing.two, gap: Spacing.one },
  postAuthor: { ...Typography.caption, color: Brand.text, fontFamily: Typography.bodyStrong.fontFamily },
  postPhoto: { width: '100%', height: 140, borderRadius: Radius.sm, backgroundColor: Brand.surface },
  postText: { ...Typography.caption, color: Brand.text },
  postGone: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  postGoneText: { ...Typography.caption, color: Brand.textMuted },
  meta: { ...Typography.caption, fontSize: 11, color: 'rgba(255,255,255,0.55)', alignSelf: 'flex-end', paddingHorizontal: Spacing.one },
  failed: { color: Brand.error },
  seen: { ...Typography.caption, fontSize: 11, color: Brand.textMuted, marginTop: 2 },
  event: { ...Typography.caption, color: Brand.textMuted, textAlign: 'center', marginVertical: Spacing.two, paddingHorizontal: Spacing.four },
});

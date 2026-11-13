import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '@/components/ui/Avatar';
import { Motion } from '@/constants/motion';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import type { BubblePosition } from '@/features/chat/lib/thread-layout';
import type { ChatPhoto, PendingMessage } from '@/types/chat';

interface MessageBubbleProps {
  message: PendingMessage;
  /** A time line above it, e.g. "Today 14:05". */
  header: string | null;
  position: BubblePosition;
  /** Show the sender's name above the first of their messages (groups). */
  showAuthor: boolean;
  /** "Seen" under it: your latest message in a 1:1 chat, once they read it. */
  seen: boolean;
  /** Arrived or was sent while the chat was open: it slides in. */
  fresh: boolean;
  onRetry: (message: PendingMessage) => void;
  /** Hold a message: its menu (copy, unsend). */
  onLongPress: (message: PendingMessage) => void;
  onOpenPost: (postId: string) => void;
  onOpenPhoto: (photo: ChatPhoto) => void;
}

const PHOTO_WIDTH = 240;
const PHOTO_MAX_HEIGHT = 320;
const AVATAR = 28;
const TIGHT = 4;

function photoSize(width: number, height: number) {
  const w = PHOTO_WIDTH;
  const h = Math.min(PHOTO_MAX_HEIGHT, Math.round((w * height) / Math.max(1, width)));
  return { width: w, height: h };
}

/** Bubbles in a run join up on the sender's side, as on Instagram. */
function corners(position: BubblePosition, mine: boolean) {
  const top = position === 'middle' || position === 'last';
  const bottom = position === 'middle' || position === 'first';
  return mine
    ? { borderTopRightRadius: top ? TIGHT : Radius.lg, borderBottomRightRadius: bottom ? TIGHT : Radius.lg }
    : { borderTopLeftRadius: top ? TIGHT : Radius.lg, borderBottomLeftRadius: bottom ? TIGHT : Radius.lg };
}

/** A chat bubble: yours on the right in purple, others on the left with their photo by the last of a run; group lines centred. */
export const MessageBubble = memo(function MessageBubble({
  message,
  header,
  position,
  showAuthor,
  seen,
  fresh,
  onRetry,
  onLongPress,
  onOpenPost,
  onOpenPhoto,
}: MessageBubbleProps) {
  const entering = fresh ? FadeInDown.duration(Motion.duration.base) : undefined;
  const headerLine = header ? <Text style={styles.header}>{header}</Text> : null;

  if (message.kind === 'event') {
    return (
      <Animated.View entering={entering}>
        {headerLine}
        <Text style={styles.event}>{message.text}</Text>
      </Animated.View>
    );
  }

  const failed = message.sendState === 'failed';
  const pending = !!message.sendState;
  const photo = message.photo ?? message.upload;
  const uri = message.photo?.url ?? message.upload?.uri;
  const post = message.post;
  const opensRun = position === 'single' || position === 'first';
  const closesRun = position === 'single' || position === 'last';

  return (
    <Animated.View entering={entering}>
      {headerLine}
      <View style={[styles.row, message.mine && styles.rowMine, opensRun ? styles.rowOpen : styles.rowJoined]}>
        {!message.mine ? (
          <View style={styles.avatar}>
            {closesRun && message.sender ? <Avatar name={message.sender.name || message.sender.username} uri={message.sender.avatarUrl} size={AVATAR} /> : null}
          </View>
        ) : null}
        <View style={[styles.column, message.mine && styles.columnMine]}>
          {showAuthor && opensRun && !message.mine && message.sender ? <Text style={styles.author}>{message.sender.name || message.sender.username}</Text> : null}
          <Pressable
            accessibilityRole={failed ? 'button' : undefined}
            accessibilityHint={failed ? 'Double tap to retry sending' : 'Long press for options'}
            onPress={failed ? () => onRetry(message) : undefined}
            onLongPress={pending ? undefined : () => onLongPress(message)}
            delayLongPress={300}
            style={({ pressed }) => [
              styles.bubble,
              message.mine ? styles.bubbleMine : styles.bubbleOther,
              corners(position, message.mine),
              photo && !message.text ? styles.bubblePhoto : null,
              message.sendState === 'sending' && styles.sending,
              pressed && !failed && styles.pressed,
            ]}
          >
            {photo && uri ? (
              <Pressable
                accessibilityRole="imagebutton"
                accessibilityLabel="Photo. Opens full screen"
                disabled={!message.photo}
                onPress={() => message.photo && onOpenPhoto(message.photo)}
                onLongPress={pending ? undefined : () => onLongPress(message)}
                delayLongPress={300}
              >
                <Image source={{ uri }} style={[styles.photo, photoSize(photo.width, photo.height)]} contentFit="cover" transition={150} />
              </Pressable>
            ) : null}

            {post ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={post.available ? `Post by ${post.author?.name ?? ''}` : 'Post unavailable'}
                disabled={!post.available}
                onPress={() => onOpenPost(post.id)}
                onLongPress={() => onLongPress(message)}
                delayLongPress={300}
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
            {pending ? <Text style={[styles.meta, failed && styles.failed]}>{failed ? 'Not sent · tap to retry' : 'Sending…'}</Text> : null}
          </Pressable>
          {seen ? <Text style={styles.seen}>Seen</Text> : null}
        </View>
      </View>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  header: { ...Typography.caption, fontSize: 12, color: Brand.textMuted, textAlign: 'center', marginTop: Spacing.four, marginBottom: Spacing.two },
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.two },
  rowMine: { justifyContent: 'flex-end' },
  rowOpen: { marginTop: Spacing.two },
  rowJoined: { marginTop: 2 },
  avatar: { width: AVATAR },
  column: { maxWidth: '78%', alignItems: 'flex-start' },
  columnMine: { alignItems: 'flex-end' },
  bubble: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.two + 2, borderRadius: Radius.lg, gap: Spacing.one },
  bubbleMine: { backgroundColor: Brand.primaryDeep },
  bubbleOther: { backgroundColor: Brand.surfaceAlt },
  bubblePhoto: { padding: Spacing.one },
  pressed: { opacity: 0.8, transform: [{ scale: 0.98 }] },
  sending: { opacity: 0.6 },
  author: { ...Typography.caption, color: Brand.textMuted, marginBottom: 2, marginLeft: Spacing.two },
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

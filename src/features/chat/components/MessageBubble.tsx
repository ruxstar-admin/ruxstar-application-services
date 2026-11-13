import { memo } from 'react';
import { Pressable, StyleSheet, Text, View, type AccessibilityActionEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { FadeInDown, ZoomIn, interpolate, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '@/components/ui/Avatar';
import { Motion } from '@/constants/motion';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { VoiceNote } from '@/features/chat/components/VoiceNote';
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
  /** Reacting and replying: false in a request you haven't accepted. */
  canRespond: boolean;
  onRetry: (message: PendingMessage) => void;
  /** Hold a message: its menu (react, reply, copy, unsend). */
  onLongPress: (message: PendingMessage) => void;
  onReact: (message: PendingMessage, emoji: string) => void;
  onReply: (message: PendingMessage) => void;
  onOpenPost: (postId: string) => void;
  onOpenPhoto: (photo: ChatPhoto) => void;
}

const PHOTO_WIDTH = 240;
const PHOTO_MAX_HEIGHT = 320;
const AVATAR = 28;
const TIGHT = 4;
/** Swipe a message right this far to reply to it. */
const REPLY_AT = 56;
const SWIPE_MAX = 80;
const TAP_SLOP = 10;

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

/**
 * A chat bubble: yours on the right in purple, others on the left with their photo by the last of a run; group
 * lines centred. Double-tap to ❤️, hold for the menu, swipe right to reply.
 */
export const MessageBubble = memo(function MessageBubble({
  message,
  header,
  position,
  showAuthor,
  seen,
  fresh,
  canRespond,
  onRetry,
  onLongPress,
  onReact,
  onReply,
  onOpenPost,
  onOpenPhoto,
}: MessageBubbleProps) {
  const entering = fresh ? FadeInDown.duration(Motion.duration.base) : undefined;
  const headerLine = header ? <Text style={styles.header}>{header}</Text> : null;
  const failed = message.sendState === 'failed';
  const pending = !!message.sendState;
  const responds = canRespond && !pending && message.kind !== 'event';
  const swipe = useSharedValue(0);

  const tapAction = () => {
    if (failed) return onRetry(message);
    if (message.photo) return onOpenPhoto(message.photo);
    if (message.post?.available) return onOpenPost(message.post.id);
  };
  const heart = () => onReact(message, '❤️');
  const hold = () => onLongPress(message);
  const reply = () => onReply(message);

  // Rebuilt each render so the handlers see this render's message; the bubble itself is memoised.
  const gesture = (() => {
    const single = Gesture.Tap()
      .maxDistance(TAP_SLOP)
      .onEnd((_e, ok) => ok && scheduleOnRN(tapAction));
    const double = Gesture.Tap()
      .numberOfTaps(2)
      .maxDistance(TAP_SLOP)
      .enabled(responds)
      .onEnd((_e, ok) => ok && scheduleOnRN(heart));
    const long = Gesture.LongPress()
      .minDuration(300)
      .maxDistance(TAP_SLOP)
      .enabled(!pending)
      .onStart(() => scheduleOnRN(hold));
    const pan = Gesture.Pan()
      .enabled(responds)
      .activeOffsetX(14)
      .failOffsetX(-14)
      .failOffsetY([-12, 12])
      .onUpdate((e) => {
        swipe.value = Math.min(SWIPE_MAX, Math.max(0, e.translationX * 0.7));
      })
      .onEnd(() => {
        if (swipe.value >= REPLY_AT) scheduleOnRN(reply);
        swipe.value = withSpring(0, { damping: 18, stiffness: 220 });
      });
    return Gesture.Race(pan, Gesture.Exclusive(long, double, single));
  })();

  const slide = useAnimatedStyle(() => ({ transform: [{ translateX: swipe.value }] }));
  const arrow = useAnimatedStyle(() => ({
    opacity: interpolate(swipe.value, [0, REPLY_AT], [0, 1], 'clamp'),
    transform: [{ scale: interpolate(swipe.value, [0, REPLY_AT], [0.6, 1], 'clamp') }],
  }));

  if (message.kind === 'event') {
    return (
      <Animated.View entering={entering}>
        {headerLine}
        <Text style={styles.event}>{message.text}</Text>
      </Animated.View>
    );
  }

  const photo = message.photo ?? message.upload;
  const uri = message.photo?.url ?? message.upload?.uri;
  const voice = message.voice ?? (message.recording ? { url: message.recording.uri, durationMs: message.recording.durationMs, levels: message.recording.levels } : null);
  const post = message.post;
  const opensRun = position === 'single' || position === 'first';
  const closesRun = position === 'single' || position === 'last';
  const total = message.reactions.reduce((sum, r) => sum + r.count, 0);

  const actions = [
    ...(responds ? [{ name: 'magicTap', label: 'Like' }, { name: 'reply', label: 'Reply' }] : []),
    ...(!pending ? [{ name: 'longpress', label: 'Options' }] : []),
    ...(failed || message.photo || post?.available ? [{ name: 'activate', label: failed ? 'Retry' : 'Open' }] : []),
  ];
  const onAction = (e: AccessibilityActionEvent) => {
    const name = e.nativeEvent.actionName;
    if (name === 'magicTap') heart();
    else if (name === 'reply') reply();
    else if (name === 'longpress') hold();
    else if (name === 'activate') tapAction();
  };

  return (
    <Animated.View entering={entering}>
      {headerLine}
      <View style={[styles.row, message.mine && styles.rowMine, opensRun ? styles.rowOpen : styles.rowJoined]}>
        <Animated.View style={[styles.replyArrow, arrow]} pointerEvents="none">
          <Ionicons name="arrow-undo" size={18} color={Brand.textMuted} />
        </Animated.View>
        {!message.mine ? (
          <View style={styles.avatar}>
            {closesRun && message.sender ? <Avatar name={message.sender.name || message.sender.username} uri={message.sender.avatarUrl} size={AVATAR} /> : null}
          </View>
        ) : null}
        <Animated.View style={[styles.column, message.mine && styles.columnMine, slide]}>
          {showAuthor && opensRun && !message.mine && message.sender ? <Text style={styles.author}>{message.sender.name || message.sender.username}</Text> : null}

          {message.replyTo ? (
            <View style={[styles.quote, message.mine && styles.quoteMine]}>
              <Text style={styles.quoteLabel} numberOfLines={1}>
                {message.mine
                  ? message.replyTo.mine
                    ? 'You replied to yourself'
                    : `You replied to ${message.replyTo.sender}`
                  : message.replyTo.mine
                    ? 'Replied to you'
                    : `Replied to ${message.replyTo.sender}`}
              </Text>
              <View style={styles.quoteBubble}>
                <Text style={[styles.quoteText, !message.replyTo.available && styles.quoteGone]} numberOfLines={2}>
                  {message.replyTo.available ? message.replyTo.text : 'Message unsent'}
                </Text>
              </View>
            </View>
          ) : null}

          <GestureDetector gesture={gesture}>
            <View
              accessible
              accessibilityRole={failed ? 'button' : undefined}
              accessibilityLabel={[
                message.mine ? 'You' : message.sender?.name,
                message.text || (message.kind === 'photo' ? 'Photo' : message.kind === 'voice' ? 'Voice message' : post ? 'Shared post' : ''),
                failed ? 'Not sent' : '',
                total ? `${total} reaction${total > 1 ? 's' : ''}` : '',
              ]
                .filter(Boolean)
                .join(', ')}
              accessibilityActions={actions}
              onAccessibilityAction={onAction}
              style={[
                styles.bubble,
                message.mine ? styles.bubbleMine : styles.bubbleOther,
                corners(position, message.mine),
                photo && !message.text ? styles.bubblePhoto : null,
                message.sendState === 'sending' && styles.sending,
              ]}
            >
              {photo && uri ? <Image source={{ uri }} style={[styles.photo, photoSize(photo.width, photo.height)]} contentFit="cover" transition={150} /> : null}

              {voice ? <VoiceNote uri={voice.url} durationMs={voice.durationMs} levels={voice.levels} mine={message.mine} /> : null}

              {post ? (
                <View style={styles.post}>
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
                </View>
              ) : null}

              {message.text ? <Text style={styles.text}>{message.text}</Text> : null}
              {pending ? <Text style={[styles.meta, failed && styles.failed]}>{failed ? 'Not sent · tap to retry' : 'Sending…'}</Text> : null}
            </View>
          </GestureDetector>

          {total > 0 ? (
            <Animated.View key={message.reactions.map((r) => `${r.emoji}${r.count}`).join()} entering={ZoomIn.springify().damping(14)}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Reactions: ${message.reactions.map((r) => `${r.emoji} ${r.count}`).join(', ')}. Opens options`}
                onPress={hold}
                style={[styles.reactions, message.mine && styles.reactionsMine]}
              >
                <Text style={styles.reactionEmoji}>{message.reactions.slice(0, 3).map((r) => r.emoji).join('')}</Text>
                {total > 1 ? <Text style={styles.reactionCount}>{total}</Text> : null}
              </Pressable>
            </Animated.View>
          ) : null}
          {seen ? <Text style={styles.seen}>Seen</Text> : null}
        </Animated.View>
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
  replyArrow: { position: 'absolute', left: 0, top: 0, bottom: 0, justifyContent: 'center' },
  avatar: { width: AVATAR },
  column: { maxWidth: '78%', alignItems: 'flex-start' },
  columnMine: { alignItems: 'flex-end' },
  bubble: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.two + 2, borderRadius: Radius.lg, gap: Spacing.one },
  bubbleMine: { backgroundColor: Brand.primaryDeep },
  bubbleOther: { backgroundColor: Brand.surfaceAlt },
  bubblePhoto: { padding: Spacing.one },
  sending: { opacity: 0.6 },
  author: { ...Typography.caption, color: Brand.textMuted, marginBottom: 2, marginLeft: Spacing.two },
  quote: { alignItems: 'flex-start', marginBottom: -Spacing.two, paddingBottom: Spacing.two + 2, opacity: 0.85 },
  quoteMine: { alignItems: 'flex-end' },
  quoteLabel: { ...Typography.caption, fontSize: 11, color: Brand.textMuted, marginBottom: 2, marginHorizontal: Spacing.two },
  quoteBubble: { paddingHorizontal: Spacing.three, paddingTop: Spacing.two, paddingBottom: Spacing.three, borderRadius: Radius.lg, backgroundColor: Brand.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: Brand.border },
  quoteText: { ...Typography.caption, color: Brand.textMuted },
  quoteGone: { fontStyle: 'italic' },
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
  reactions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: -Spacing.two,
    marginLeft: Spacing.two,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.pill,
    backgroundColor: Brand.surfaceAlt,
    borderWidth: 2,
    borderColor: Brand.bg,
  },
  reactionsMine: { marginLeft: 0, marginRight: Spacing.two },
  reactionEmoji: { fontSize: 13, lineHeight: 18 },
  reactionCount: { ...Typography.caption, fontSize: 12, color: Brand.text },
  seen: { ...Typography.caption, fontSize: 11, color: Brand.textMuted, marginTop: 2 },
  event: { ...Typography.caption, color: Brand.textMuted, textAlign: 'center', marginVertical: Spacing.two, paddingHorizontal: Spacing.four },
});

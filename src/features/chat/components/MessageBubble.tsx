import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { timeAgo } from '@/lib/time';
import type { PendingMessage } from '@/types/chat';

interface MessageBubbleProps {
  message: PendingMessage;
  /** Show the sender's name above the bubble (groups and communities, other people's messages). */
  showAuthor: boolean;
  onRetry: (message: PendingMessage) => void;
  onLongPress: (message: PendingMessage) => void;
}

/** A chat bubble: yours on the right in purple, others on the left. Unsent messages show their state. */
export const MessageBubble = memo(function MessageBubble({ message, showAuthor, onRetry, onLongPress }: MessageBubbleProps) {
  const failed = message.sendState === 'failed';

  return (
    <View style={[styles.row, message.mine && styles.rowMine]}>
      <Pressable
        accessibilityRole={failed ? 'button' : 'text'}
        accessibilityHint={failed ? 'Double tap to retry sending' : undefined}
        onPress={failed ? () => onRetry(message) : undefined}
        onLongPress={message.mine ? undefined : () => onLongPress(message)}
        style={[styles.bubble, message.mine ? styles.bubbleMine : styles.bubbleOther, message.sendState === 'sending' && styles.sending]}
      >
        {showAuthor && !message.mine ? <Text style={styles.author}>{message.author.name}</Text> : null}
        <Text style={styles.text}>{message.text}</Text>
        <Text style={[styles.meta, failed && styles.failed]}>
          {failed ? 'Not sent · tap to retry' : message.sendState === 'sending' ? 'Sending…' : timeAgo(message.createdAt)}
        </Text>
      </Pressable>
    </View>
  );
});

const styles = StyleSheet.create({
  row: { flexDirection: 'row', marginVertical: Spacing.one },
  rowMine: { justifyContent: 'flex-end' },
  bubble: { maxWidth: '80%', paddingHorizontal: Spacing.three, paddingVertical: Spacing.two + 2, borderRadius: Radius.lg, gap: 2 },
  bubbleMine: { backgroundColor: Brand.primaryDeep, borderBottomRightRadius: Radius.sm },
  bubbleOther: { backgroundColor: Brand.surfaceAlt, borderBottomLeftRadius: Radius.sm },
  sending: { opacity: 0.6 },
  author: { ...Typography.caption, color: Brand.primarySoft, fontFamily: Typography.bodyStrong.fontFamily },
  text: { ...Typography.body, color: Brand.text },
  meta: { ...Typography.caption, fontSize: 11, color: 'rgba(255,255,255,0.55)', alignSelf: 'flex-end' },
  failed: { color: Brand.error },
});

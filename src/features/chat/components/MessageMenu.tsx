import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { ListRow } from '@/components/ui/ListRow';
import { Brand, Radius, Spacing } from '@/constants/theme';
import { stampLabel } from '@/features/chat/lib/thread-layout';
import { Feedback } from '@/lib/haptics';
import type { PendingMessage } from '@/types/chat';

/** The quick reactions, as on Instagram. */
export const QUICK_REACTIONS = ['❤️', '😂', '😮', '😢', '🔥', '👍'];

interface MessageMenuProps {
  message: PendingMessage | null;
  /** False in a request you haven't accepted. */
  canRespond: boolean;
  onClose: () => void;
  onReact: (message: PendingMessage, emoji: string) => void;
  onReply: (message: PendingMessage) => void;
  onUnsend: (message: PendingMessage) => void;
}

/** What you get when you hold a message: quick reactions, when it was sent, Reply, Copy, and Unsend for your own. */
export function MessageMenu({ message, canRespond, onClose, onReact, onReply, onUnsend }: MessageMenuProps) {
  const mineEmoji = message?.reactions.find((r) => r.mine)?.emoji;

  const copy = async () => {
    if (!message?.text) return;
    await Clipboard.setStringAsync(message.text);
    Feedback.success();
    onClose();
  };

  const choose = (next: () => void) => {
    onClose();
    next();
  };

  return (
    <BottomSheet visible={!!message} onClose={onClose} title={message ? `Sent ${stampLabel(message.createdAt)}` : undefined}>
      {message && canRespond ? (
        <View style={styles.reactions} accessibilityRole="toolbar" accessibilityLabel="React">
          {QUICK_REACTIONS.map((emoji) => (
            <Pressable
              key={emoji}
              accessibilityRole="button"
              accessibilityLabel={mineEmoji === emoji ? `Remove ${emoji}` : `React ${emoji}`}
              accessibilityState={{ selected: mineEmoji === emoji }}
              onPress={() => choose(() => onReact(message, emoji))}
              style={({ pressed }) => [styles.reaction, mineEmoji === emoji && styles.reactionOn, pressed && styles.reactionPressed]}
            >
              <Text style={styles.emoji}>{emoji}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      {message && canRespond ? <ListRow icon="arrow-undo-outline" title="Reply" onPress={() => choose(() => onReply(message))} /> : null}
      {message?.text ? <ListRow icon="copy-outline" title="Copy text" onPress={copy} /> : null}
      {message?.mine ? (
        <ListRow
          icon="trash-outline"
          title="Unsend"
          subtitle="Removes it for everyone in this chat"
          destructive
          onPress={() => choose(() => onUnsend(message))}
        />
      ) : null}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  reactions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: Spacing.two,
    marginBottom: Spacing.two,
    borderRadius: Radius.pill,
    backgroundColor: Brand.surfaceAlt,
  },
  reaction: { width: 44, height: 44, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  reactionOn: { backgroundColor: 'rgba(217,160,255,0.22)' },
  reactionPressed: { transform: [{ scale: 1.25 }] },
  emoji: { fontSize: 26 },
});

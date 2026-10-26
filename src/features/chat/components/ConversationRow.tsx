import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '@/components/ui/Avatar';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { Feedback } from '@/lib/haptics';
import { timeAgo } from '@/lib/time';
import type { Conversation } from '@/types/chat';

interface ConversationRowProps {
  conversation: Conversation;
  onPress: (conversation: Conversation) => void;
  /** Trailing action for discover lists (e.g. a Join button); replaces the time and unread badge. */
  trailing?: React.ReactNode;
}

const KIND_ICON = { group: 'people', community: 'megaphone' } as const;

/** One row in a conversation list: avatar (or group / community icon), title, last message, time, unread count. */
export function ConversationRow({ conversation, onPress, trailing }: ConversationRowProps) {
  const { kind, title, lastMessage, lastAt, unread, members } = conversation;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={unread > 0 ? `${title}, ${unread} unread` : title}
      onPress={() => {
        Feedback.tap();
        onPress(conversation);
      }}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      {kind === 'dm' ? (
        <Avatar name={title} uri={conversation.avatarUrl} size={48} />
      ) : (
        <View style={styles.kindIcon}>
          <Ionicons name={KIND_ICON[kind]} size={22} color={Brand.primarySoft} />
        </View>
      )}

      <View style={styles.text}>
        <Text style={[styles.title, unread > 0 && styles.unreadTitle]} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.preview} numberOfLines={1}>
          {members && kind !== 'dm' && !lastMessage ? `${members.toLocaleString('en-IN')} members` : lastMessage}
        </Text>
      </View>

      {trailing ?? (
        <View style={styles.meta}>
          <Text style={styles.time}>{timeAgo(lastAt)}</Text>
          {unread > 0 ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unread > 99 ? '99+' : unread}</Text>
            </View>
          ) : null}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingVertical: Spacing.three },
  pressed: { opacity: 0.6 },
  kindIcon: { width: 48, height: 48, borderRadius: Radius.pill, backgroundColor: 'rgba(180,92,242,0.14)', alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, gap: 2 },
  title: { ...Typography.body, color: Brand.text },
  unreadTitle: { fontFamily: Typography.bodyStrong.fontFamily },
  preview: { ...Typography.caption, color: Brand.textMuted },
  meta: { alignItems: 'flex-end', gap: Spacing.one },
  time: { ...Typography.caption, color: Brand.textFaint },
  badge: { minWidth: 20, height: 20, borderRadius: Radius.pill, backgroundColor: Brand.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  badgeText: { ...Typography.caption, fontSize: 11, color: Brand.text },
});

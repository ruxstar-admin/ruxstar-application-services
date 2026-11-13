import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '@/components/ui/Avatar';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { Feedback } from '@/lib/haptics';
import { timeAgo } from '@/lib/time';
import type { Chat } from '@/types/chat';

interface ConversationRowProps {
  chat: Chat;
  onPress: (chat: Chat) => void;
}

const previewOf = ({ kind, members, last }: Chat) => {
  if (!last) return kind === 'group' ? `${members} people` : '';
  return last.mine && last.kind !== 'event' ? `You: ${last.text}` : last.text;
};

/** One row in the chat list: avatar (or group icon), name, latest message, time, unread count. Muted chats show a grey count. */
export const ConversationRow = memo(function ConversationRow({ chat, onPress }: ConversationRowProps) {
  const { kind, title, peer, unread, muted, last } = chat;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={unread > 0 ? `${title}, ${unread} unread` : title}
      onPress={() => {
        Feedback.tap();
        onPress(chat);
      }}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      {kind === 'dm' ? (
        <Avatar name={title} uri={peer?.avatarUrl} size={48} />
      ) : (
        <View style={styles.groupIcon}>
          <Ionicons name="people" size={22} color={Brand.primarySoft} />
        </View>
      )}

      <View style={styles.text}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, unread > 0 && styles.unreadTitle]} numberOfLines={1}>
            {title}
          </Text>
          {peer?.verified ? <Ionicons name="checkmark-circle" size={14} color={Brand.primarySoft} /> : null}
          {muted ? <Ionicons name="notifications-off-outline" size={14} color={Brand.textFaint} accessibilityLabel="Muted" /> : null}
        </View>
        <Text style={[styles.preview, unread > 0 && styles.unreadPreview]} numberOfLines={1}>
          {previewOf(chat)}
        </Text>
      </View>

      <View style={styles.meta}>
        {last ? <Text style={styles.time}>{timeAgo(last.at)}</Text> : null}
        {unread > 0 ? (
          <View style={[styles.badge, muted && styles.badgeMuted]}>
            <Text style={styles.badgeText}>{unread > 99 ? '99+' : unread}</Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingVertical: Spacing.three },
  pressed: { opacity: 0.6 },
  groupIcon: { width: 48, height: 48, borderRadius: Radius.pill, backgroundColor: 'rgba(180,92,242,0.14)', alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, gap: 2 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  title: { ...Typography.body, color: Brand.text, flexShrink: 1 },
  unreadTitle: { fontFamily: Typography.bodyStrong.fontFamily },
  preview: { ...Typography.caption, color: Brand.textMuted },
  unreadPreview: { color: Brand.text },
  meta: { alignItems: 'flex-end', gap: Spacing.one },
  time: { ...Typography.caption, color: Brand.textFaint },
  badge: { minWidth: 20, height: 20, borderRadius: Radius.pill, backgroundColor: Brand.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  badgeMuted: { backgroundColor: Brand.surfaceAlt },
  badgeText: { ...Typography.caption, fontSize: 11, color: Brand.text },
});

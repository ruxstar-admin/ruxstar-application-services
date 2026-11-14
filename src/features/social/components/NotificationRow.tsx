import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { timeAgo } from '@/lib/time';
import type { AppNotification, NotificationKind } from '@/types/social';

const ICONS: Record<NotificationKind, keyof typeof Ionicons.glyphMap> = {
  employment: 'briefcase-outline',
  order: 'cube-outline',
  class: 'alarm-outline',
  social: 'heart-outline',
  account: 'shield-checkmark-outline',
};

/** Types whose icon says more than their kind's. */
const TYPE_ICONS: Partial<Record<string, keyof typeof Ionicons.glyphMap>> = {
  'user.followed': 'person-add-outline',
  'post.like': 'heart-outline',
  'post.comment': 'chatbubble-outline',
  'post.mention': 'at-outline',
  'post.removed': 'flag-outline',
  'report.resolved': 'shield-outline',
  'order.placed': 'cube-outline',
  'order.updated': 'cube-outline',
  'payout.updated': 'wallet-outline',
  'review.posted': 'star-outline',
  'review.replied': 'chatbox-outline',
  'review.removed': 'flag-outline',
  'team.invited': 'people-outline',
  'team.joined': 'people-outline',
  'team.ended': 'people-outline',
  'business.suspended': 'alert-circle-outline',
  'business.restored': 'storefront-outline',
  'delivery.offer': 'bicycle-outline',
  'delivery.updated': 'bicycle-outline',
};

export const notificationIcon = (n: Pick<AppNotification, 'kind' | 'type'>) => (n.type && TYPE_ICONS[n.type]) || ICONS[n.kind];

interface NotificationRowProps {
  notification: AppNotification;
  onOpen?: (notification: AppNotification) => void;
}

/** One notification: icon, text, time and an unread dot. */
export function NotificationRow({ notification, onOpen }: NotificationRowProps) {
  return (
    <Pressable
      accessibilityRole={onOpen ? 'button' : undefined}
      disabled={!onOpen}
      onPress={onOpen ? () => onOpen(notification) : undefined}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.icon}>
        <Ionicons name={notificationIcon(notification)} size={20} color={Brand.primarySoft} />
      </View>
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>{notification.title}</Text>
          <Text style={styles.time}>{timeAgo(notification.createdAt)}</Text>
        </View>
        <Text style={styles.text}>{notification.body}</Text>
      </View>
      {!notification.read ? <View style={styles.dot} accessibilityLabel="Unread" /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: Spacing.three, paddingVertical: Spacing.three, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Brand.border },
  pressed: { opacity: 0.7 },
  icon: { width: 40, height: 40, borderRadius: Radius.pill, backgroundColor: 'rgba(180,92,242,0.14)', alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, gap: Spacing.one },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.two },
  title: { ...Typography.bodyStrong, color: Brand.text },
  time: { ...Typography.caption, color: Brand.textFaint },
  text: { ...Typography.body, color: Brand.textMuted },
  dot: { width: 8, height: 8, borderRadius: Radius.pill, backgroundColor: Brand.primary, marginTop: Spacing.two },
});

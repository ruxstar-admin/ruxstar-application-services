import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Chip } from '@/components/ui/Chip';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { timeAgo } from '@/lib/time';
import type { AppNotification, NotificationKind } from '@/types/social';

const ICONS: Record<NotificationKind, keyof typeof Ionicons.glyphMap> = {
  employment: 'briefcase-outline',
  order: 'cube-outline',
  class: 'alarm-outline',
  social: 'heart-outline',
};

interface NotificationRowProps {
  notification: AppNotification;
  /** Which action is currently in flight for this row, to disable the buttons. */
  busy: boolean;
  onRespond: (notification: AppNotification, accept: boolean) => void;
  onOpen?: (notification: AppNotification) => void;
}

/** One notification: icon, text, time, an unread dot, and Accept / Decline for employment offers. */
export function NotificationRow({ notification, busy, onRespond, onOpen }: NotificationRowProps) {
  return (
    <Pressable
      accessibilityRole={onOpen ? 'button' : undefined}
      disabled={!onOpen}
      onPress={onOpen ? () => onOpen(notification) : undefined}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.icon}>
        <Ionicons name={ICONS[notification.kind]} size={20} color={Brand.primarySoft} />
      </View>
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>{notification.title}</Text>
          <Text style={styles.time}>{timeAgo(notification.createdAt)}</Text>
        </View>
        <Text style={styles.text}>{notification.body}</Text>
        {notification.actionable ? (
          <View style={styles.actions}>
            <Chip label="Accept" disabled={busy} onPress={() => onRespond(notification, true)} />
            <Chip label="Decline" disabled={busy} onPress={() => onRespond(notification, false)} />
          </View>
        ) : null}
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
  actions: { flexDirection: 'row', gap: Spacing.two, marginTop: Spacing.two },
  dot: { width: 8, height: 8, borderRadius: Radius.pill, backgroundColor: Brand.primary, marginTop: Spacing.two },
});

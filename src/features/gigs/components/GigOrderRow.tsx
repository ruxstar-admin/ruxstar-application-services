import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Badge } from '@/components/ui/Badge';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { money } from '@/features/vendor/lib/pod';
import { Feedback } from '@/lib/haptics';
import { timeAgo } from '@/lib/time';
import type { GigOrder } from '@/types/gigs';
import { deadlineText, orderStatus } from '../lib/gigs';

/** One freelance order in a list: what, with whom, how much, where it is and the next deadline. */
export function GigOrderRow({ order, subtitle, amount, now, onPress }: { order: GigOrder; subtitle: string; amount: number | null; now: number; onPress: () => void }) {
  const status = orderStatus(order);
  const deadline = deadlineText(order, now);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[`Order ${order.orderNo}`, order.title, subtitle, status.label, deadline].filter(Boolean).join(', ')}
      onPress={() => {
        Feedback.tap();
        onPress();
      }}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.icon}>
        <Ionicons name={order.quoteId ? 'document-text-outline' : 'briefcase-outline'} size={20} color={Brand.primarySoft} />
      </View>
      <View style={styles.text}>
        <Text style={styles.title} numberOfLines={1}>
          {order.title}
        </Text>
        <Text style={styles.subtitle} numberOfLines={1}>{`#${order.orderNo} · ${subtitle} · ${timeAgo(order.createdAt)}`}</Text>
        {deadline ? <Text style={[styles.subtitle, order.late && styles.late]}>{deadline}</Text> : null}
      </View>
      <View style={styles.right}>
        {amount === null ? null : <Text style={styles.amount}>{money(amount)}</Text>}
        <Badge label={status.label} tone={status.tone} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    marginBottom: Spacing.two,
    borderRadius: Radius.lg,
    backgroundColor: Brand.surface,
    borderWidth: 1,
    borderColor: Brand.border,
  },
  pressed: { opacity: 0.7 },
  icon: { width: 40, height: 40, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(180,92,242,0.14)' },
  text: { flex: 1, gap: 2 },
  title: { ...Typography.bodyStrong, color: Brand.text },
  subtitle: { ...Typography.caption, color: Brand.textMuted },
  late: { color: Brand.error },
  right: { alignItems: 'flex-end', gap: Spacing.one, maxWidth: '45%' },
  amount: { ...Typography.bodyStrong, color: Brand.text },
});

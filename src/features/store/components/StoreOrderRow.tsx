import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Badge } from '@/components/ui/Badge';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { money } from '@/features/vendor/lib/pod';
import { Feedback } from '@/lib/haptics';
import { timeAgo } from '@/lib/time';
import type { StoreOrderStatus, StoreMethod, StoreOrderLine, StoreReturn } from '@/types/store';
import { itemsCount, linesText, statusOf } from '../lib/store';

interface StoreOrderRowProps {
  order: {
    orderNo: number;
    status: StoreOrderStatus;
    method: StoreMethod;
    lines: Pick<StoreOrderLine, 'title' | 'quantity'>[];
    return: Pick<StoreReturn, 'status'> | null;
    createdAt: string;
  };
  /** The shop for a customer, the customer for the shop. */
  subtitle: string;
  /** Left out when null, as for someone on the team who can't see the money. */
  amount: number | null;
  onPress: () => void;
}

/** One shop order in a list: what, from or for whom, how much, and where it is. */
export function StoreOrderRow({ order, subtitle, amount, onPress }: StoreOrderRowProps) {
  const status = statusOf(order);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Order ${order.orderNo}, ${linesText(order.lines)}, ${subtitle}, ${status.label}`}
      onPress={() => {
        Feedback.tap();
        onPress();
      }}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.icon}>
        <Ionicons name="bag-handle-outline" size={20} color={Brand.primarySoft} />
      </View>
      <View style={styles.text}>
        <Text style={styles.title} numberOfLines={1}>
          {linesText(order.lines)}
        </Text>
        <Text style={styles.subtitle} numberOfLines={1}>{`#${order.orderNo} · ${subtitle} · ${itemsCount(order.lines)} · ${order.method === 'pickup' ? 'Pickup' : 'Delivery'} · ${timeAgo(order.createdAt)}`}</Text>
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
  right: { alignItems: 'flex-end', gap: Spacing.one },
  amount: { ...Typography.bodyStrong, color: Brand.text },
});

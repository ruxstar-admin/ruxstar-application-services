import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Badge } from '@/components/ui/Badge';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { quantityLine, STATUS_TONE } from '@/features/pod/lib/order';
import { money } from '@/features/vendor/lib/pod';
import { Feedback } from '@/lib/haptics';
import { timeAgo } from '@/lib/time';
import type { Order, OrderStatus } from '@/types/order';

interface OrderRowProps {
  order: Pick<Order, 'orderNo' | 'productLabel' | 'pricing' | 'quantity' | 'status' | 'createdAt'>;
  /** The shop for a customer, the customer's city for a shop. */
  subtitle: string;
  /** Left out when null, as for someone on a team who can't see the shop's earnings. */
  amount: number | null;
  statusLabel: Record<OrderStatus, string>;
  onPress: () => void;
}

/** One order in a list: what, for whom, how much, and where it is. */
export function OrderRow({ order, subtitle, amount, statusLabel, onPress }: OrderRowProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        Feedback.tap();
        onPress();
      }}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.icon}>
        <Ionicons name="print-outline" size={20} color={Brand.primarySoft} />
      </View>
      <View style={styles.text}>
        <Text style={styles.title} numberOfLines={1}>
          {order.pricing === 'per_page' ? `${order.productLabel}, ${quantityLine(order)}` : quantityLine(order)}
        </Text>
        <Text style={styles.subtitle} numberOfLines={1}>{`#${order.orderNo} · ${subtitle} · ${timeAgo(order.createdAt)}`}</Text>
      </View>
      <View style={styles.right}>
        {amount === null ? null : <Text style={styles.amount}>{money(amount)}</Text>}
        <Badge label={statusLabel[order.status]} tone={STATUS_TONE[order.status]} />
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

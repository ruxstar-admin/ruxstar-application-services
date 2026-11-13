import { StyleSheet, Text, View } from 'react-native';
import { Brand, Spacing, Typography } from '@/constants/theme';
import { priceLines } from '@/features/pod/lib/order';
import { money } from '@/features/vendor/lib/pod';
import type { OrderPrice } from '@/types/order';

interface OrderPriceListProps {
  price: OrderPrice;
  pricing: 'per_unit' | 'per_page';
  /** Extra rows under the total, such as the shop's payout. */
  after?: { label: string; amount: number; negative?: boolean }[];
}

/** An order's price line by line, in paise, with the total. */
export function OrderPriceList({ price, pricing, after = [] }: OrderPriceListProps) {
  return (
    <View style={styles.container}>
      {priceLines(price, pricing).map((line) => (
        <View key={line.label} style={styles.row}>
          <Text style={styles.label}>{line.label}</Text>
          <Text style={styles.amount}>{`${line.negative ? '-' : ''}${money(line.amount)}`}</Text>
        </View>
      ))}
      <View style={[styles.row, styles.totalRow]}>
        <Text style={styles.total}>Total</Text>
        <Text style={styles.total}>{money(price.total)}</Text>
      </View>
      {after.map((line) => (
        <View key={line.label} style={styles.row}>
          <Text style={styles.label}>{line.label}</Text>
          <Text style={styles.amount}>{`${line.negative ? '-' : ''}${money(line.amount)}`}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.two },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.three },
  totalRow: { paddingTop: Spacing.two, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Brand.border },
  label: { ...Typography.body, color: Brand.textMuted, flexShrink: 1 },
  amount: { ...Typography.body, color: Brand.text },
  total: { ...Typography.bodyStrong, color: Brand.text },
});

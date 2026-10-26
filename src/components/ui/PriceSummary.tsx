import { StyleSheet, Text, View } from 'react-native';
import { Brand, Spacing, Typography } from '@/constants/theme';
import { formatRupees } from '@/lib/money';
import type { PriceLine } from '@/types/commerce';

/** Itemised price lines with a bold total; negative amounts (discounts) render as "-₹50". */
export function PriceSummary({ lines }: { lines: PriceLine[] }) {
  const total = lines.reduce((sum, line) => sum + line.amount, 0);
  const show = (amount: number) => (amount < 0 ? `-${formatRupees(-amount)}` : formatRupees(amount));

  return (
    <View style={styles.container}>
      {lines.map((line) => (
        <View key={line.label} style={styles.row}>
          <Text style={styles.label}>{line.label}</Text>
          <Text style={styles.amount}>{show(line.amount)}</Text>
        </View>
      ))}
      <View style={[styles.row, styles.totalRow]}>
        <Text style={styles.total}>Total</Text>
        <Text style={styles.total}>{formatRupees(total)}</Text>
      </View>
    </View>
  );
}

export const priceTotal = (lines: PriceLine[]) => lines.reduce((sum, line) => sum + line.amount, 0);

const styles = StyleSheet.create({
  container: { gap: Spacing.two },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  totalRow: { paddingTop: Spacing.two, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Brand.border },
  label: { ...Typography.body, color: Brand.textMuted },
  amount: { ...Typography.body, color: Brand.text },
  total: { ...Typography.bodyStrong, color: Brand.text },
});

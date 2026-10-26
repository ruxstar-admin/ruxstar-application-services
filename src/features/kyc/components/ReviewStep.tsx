import { StyleSheet, Text, View } from 'react-native';
import { Badge } from '@/components/ui/Badge';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import type { ReviewRow } from '@/features/kyc/lib/flows';

/** Summary card of what will be submitted; sensitive numbers are shown only as "ending 1234". */
export function ReviewStep({ rows }: { rows: ReviewRow[] }) {
  return (
    <View style={styles.card}>
      {rows.map((row, i) => (
        <View key={row.label} style={[styles.row, i > 0 && styles.divider]}>
          <View style={styles.text}>
            <Text style={styles.label}>{row.label}</Text>
            <Text style={styles.detail}>{row.detail}</Text>
          </View>
          <Badge label="Ready" tone="success" />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: Brand.surface, borderRadius: Radius.lg, paddingHorizontal: Spacing.three },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.three, gap: Spacing.three },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Brand.border },
  text: { flex: 1, gap: 2 },
  label: { ...Typography.bodyStrong, color: Brand.text },
  detail: { ...Typography.caption, color: Brand.textMuted },
});

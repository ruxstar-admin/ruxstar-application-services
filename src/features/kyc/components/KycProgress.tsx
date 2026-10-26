import { StyleSheet, View } from 'react-native';
import { Brand, Radius, Spacing } from '@/constants/theme';

/** Segmented progress bar: one segment per step, filled up to and including the current one. */
export function KycProgress({ index, total }: { index: number; total: number }) {
  return (
    <View style={styles.row} accessibilityRole="progressbar" accessibilityValue={{ min: 1, max: total, now: index + 1 }}>
      {Array.from({ length: total }, (_, i) => (
        <View key={i} style={[styles.segment, i <= index && styles.active]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: Spacing.one },
  segment: { flex: 1, height: 4, borderRadius: Radius.pill, backgroundColor: Brand.surfaceAlt },
  active: { backgroundColor: Brand.primary },
});

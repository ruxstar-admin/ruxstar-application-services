import { StyleSheet, Text, View } from 'react-native';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';

/** Where someone is in a few steps: a bar per step, filled up to this one, and its name. */
export function StepBar({ steps, at }: { steps: readonly string[]; at: number }) {
  return (
    <View style={styles.wrap} accessibilityRole="progressbar" accessibilityLabel={`Step ${at + 1} of ${steps.length}: ${steps[at]}`}>
      <View style={styles.bars}>
        {steps.map((s, i) => (
          <View key={s} style={[styles.bar, i <= at && styles.barOn]} />
        ))}
      </View>
      <Text style={styles.label}>{`Step ${at + 1} of ${steps.length} · ${steps[at]}`}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.two, marginBottom: Spacing.two },
  bars: { flexDirection: 'row', gap: Spacing.one },
  bar: { flex: 1, height: 4, borderRadius: Radius.pill, backgroundColor: Brand.surfaceAlt },
  barOn: { backgroundColor: Brand.primary },
  label: { ...Typography.caption, color: Brand.textMuted },
});

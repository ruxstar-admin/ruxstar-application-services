import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { Feedback } from '@/lib/haptics';

interface ChoiceChipsProps<K extends string> {
  options: readonly { key: K; label: string }[];
  value: K;
  onChange: (key: K) => void;
  /** Smaller outlined pills, for a second row that narrows the first. */
  secondary?: boolean;
}

/** Horizontally scrolling single-select pills (search scopes, filters). */
export function ChoiceChips<K extends string>({ options, value, onChange, secondary }: ChoiceChipsProps<K>) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scroller} contentContainerStyle={styles.row} accessibilityRole="tablist">
      {options.map((option) => {
        const selected = option.key === value;
        return (
          <Pressable
            key={option.key}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => {
              if (selected) return;
              Feedback.select();
              onChange(option.key);
            }}
            style={[styles.chip, selected && styles.chipSelected, secondary && styles.subChip, secondary && selected && styles.subChipSelected]}
          >
            <Text style={[styles.label, selected && styles.labelSelected, secondary && styles.subLabel, secondary && selected && styles.subLabelSelected]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  /** ScrollView grows to fill its parent by default, which in a column leaves a tall empty band under the chips. */
  scroller: { flexGrow: 0 },
  row: { gap: Spacing.two, paddingHorizontal: Spacing.three },
  chip: { height: 36, paddingHorizontal: Spacing.three, borderRadius: Radius.pill, backgroundColor: Brand.surfaceAlt, justifyContent: 'center' },
  chipSelected: { backgroundColor: Brand.action },
  label: { ...Typography.body, fontSize: 14, color: Brand.textMuted },
  labelSelected: { color: Brand.onAction, fontFamily: Typography.bodyStrong.fontFamily },
  subChip: { height: 30, paddingHorizontal: 12, backgroundColor: 'transparent', borderWidth: 1, borderColor: Brand.border },
  subChipSelected: { backgroundColor: 'rgba(180,92,242,0.18)', borderColor: Brand.primary },
  subLabel: { fontSize: 13 },
  subLabelSelected: { color: Brand.primarySoft },
});

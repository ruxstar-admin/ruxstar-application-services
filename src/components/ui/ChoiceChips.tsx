import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { Feedback } from '@/lib/haptics';

interface ChoiceChipsProps<K extends string> {
  options: readonly { key: K; label: string }[];
  value: K;
  onChange: (key: K) => void;
}

/** Horizontally scrolling single-select pills (search scopes, filters). */
export function ChoiceChips<K extends string>({ options, value, onChange }: ChoiceChipsProps<K>) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row} accessibilityRole="tablist">
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
            style={[styles.chip, selected && styles.chipSelected]}
          >
            <Text style={[styles.label, selected && styles.labelSelected]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: Spacing.two, paddingHorizontal: Spacing.three },
  chip: { height: 36, paddingHorizontal: Spacing.three, borderRadius: Radius.pill, backgroundColor: Brand.surfaceAlt, justifyContent: 'center' },
  chipSelected: { backgroundColor: Brand.action },
  label: { ...Typography.body, fontSize: 14, color: Brand.textMuted },
  labelSelected: { color: Brand.onAction, fontFamily: Typography.bodyStrong.fontFamily },
});

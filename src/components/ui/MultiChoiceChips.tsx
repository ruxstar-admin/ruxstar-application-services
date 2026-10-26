import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { Feedback } from '@/lib/haptics';

interface MultiChoiceChipsProps<K extends string> {
  options: readonly { key: K; label: string }[];
  value: readonly K[];
  onChange: (value: K[]) => void;
}

/** Wrapping pills where any number can be selected (facility filters). */
export function MultiChoiceChips<K extends string>({ options, value, onChange }: MultiChoiceChipsProps<K>) {
  const toggle = (key: K) => {
    Feedback.select();
    onChange(value.includes(key) ? value.filter((k) => k !== key) : [...value, key]);
  };

  return (
    <ScrollView horizontal={false} scrollEnabled={false} contentContainerStyle={styles.wrap}>
      {options.map((option) => {
        const selected = value.includes(option.key);
        return (
          <Pressable
            key={option.key}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: selected }}
            onPress={() => toggle(option.key)}
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
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  chip: { height: 36, paddingHorizontal: Spacing.three, borderRadius: Radius.pill, backgroundColor: Brand.surfaceAlt, justifyContent: 'center' },
  chipSelected: { backgroundColor: Brand.action },
  label: { ...Typography.body, fontSize: 14, color: Brand.textMuted },
  labelSelected: { color: Brand.onAction, fontFamily: Typography.bodyStrong.fontFamily },
});

import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { InputField } from '@/components/ui/InputField';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { TextLink } from '@/components/ui/TextLink';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { Feedback } from '@/lib/haptics';
import type { ProductOption } from '@/types/store';

interface OptionsEditorProps {
  options: ProductOption[];
  onChange: (options: ProductOption[]) => void;
  maxOptions: number;
  maxValues: number;
}

function OptionCard({ option, onChange, onRemove, maxValues }: { option: ProductOption; onChange: (o: ProductOption) => void; onRemove: () => void; maxValues: number }) {
  const [text, setText] = useState('');
  const add = () => {
    const value = text.trim().slice(0, 40);
    if (!value || option.values.some((v) => v.toLowerCase() === value.toLowerCase())) {
      setText('');
      return;
    }
    Feedback.select();
    onChange({ ...option, values: [...option.values, value] });
    setText('');
  };
  const full = option.values.length >= maxValues;
  return (
    <View style={styles.card}>
      <InputField label="Option name" value={option.name} onChangeText={(name) => onChange({ ...option, name })} maxLength={30} placeholder="Like Size or Colour" />
      <View style={styles.values}>
        {option.values.map((v) => (
          <Pressable
            key={v}
            accessibilityRole="button"
            accessibilityLabel={`Remove ${v}`}
            onPress={() => {
              Feedback.tap();
              onChange({ ...option, values: option.values.filter((x) => x !== v) });
            }}
            style={styles.value}
          >
            <Text style={styles.valueText}>{v}</Text>
            <Ionicons name="close" size={14} color={Brand.textMuted} />
          </Pressable>
        ))}
      </View>
      {full ? (
        <Text style={styles.small}>{`Up to ${maxValues} values.`}</Text>
      ) : (
        <View style={styles.addRow}>
          <View style={styles.flex}>
            <InputField value={text} onChangeText={setText} maxLength={40} placeholder="Add a value, like M or Blue" onSubmitEditing={add} returnKeyType="done" accessibilityLabel={`Add a value to ${option.name || 'this option'}`} />
          </View>
          <View style={styles.addButton}>
            <PrimaryButton label="Add" variant="outline" onPress={add} disabled={!text.trim()} />
          </View>
        </View>
      )}
      <TextLink label="Remove this option" muted onPress={onRemove} />
    </View>
  );
}

/** Up to two options, like Size and Colour, each with its values. Every mix of values becomes a row in the table below. */
export function OptionsEditor({ options, onChange, maxOptions, maxValues }: OptionsEditorProps) {
  return (
    <View style={styles.wrap}>
      {options.map((o, i) => (
        <OptionCard
          key={i}
          option={o}
          maxValues={maxValues}
          onChange={(next) => onChange(options.map((x, j) => (j === i ? next : x)))}
          onRemove={() => onChange(options.filter((_, j) => j !== i))}
        />
      ))}
      {options.length < maxOptions ? (
        <PrimaryButton
          label={options.length ? 'Add another option' : 'Add options, like size or colour'}
          variant="outline"
          onPress={() => onChange([...options, { name: '', values: [] }])}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.three },
  card: { gap: Spacing.two, padding: Spacing.three, borderRadius: Radius.lg, backgroundColor: Brand.surface, borderWidth: 1, borderColor: Brand.border },
  values: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  value: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    minHeight: 36,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.pill,
    backgroundColor: Brand.surfaceAlt,
  },
  valueText: { ...Typography.body, fontSize: 14, color: Brand.text },
  small: { ...Typography.caption, color: Brand.textMuted },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  flex: { flex: 1 },
  addButton: { width: 88 },
});

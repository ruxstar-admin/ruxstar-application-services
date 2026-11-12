import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { FieldFrame } from '@/components/ui/FieldFrame';
import { InputField } from '@/components/ui/InputField';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { Feedback } from '@/lib/haptics';

interface SelectFieldProps {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  hint?: string;
  disabled?: boolean;
  /** Lists longer than this get a search box. */
  searchFrom?: number;
}

/** A field that opens a sheet of choices, with search for long lists (states, cities). */
export function SelectField({ label, value, options, onChange, placeholder = 'Select', error, hint, disabled, searchFrom = 12 }: SelectFieldProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? options.filter((o) => o.toLowerCase().includes(q)) : options;
  }, [options, query]);

  const close = () => {
    setOpen(false);
    setQuery('');
  };

  return (
    <>
      <FieldFrame label={label} error={error} hint={hint}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${label}: ${value || placeholder}`}
          accessibilityState={{ disabled }}
          disabled={disabled}
          onPress={() => {
            Feedback.tap();
            setOpen(true);
          }}
          style={({ pressed }) => [styles.box, !!error && styles.boxError, disabled && styles.disabled, pressed && styles.pressed]}
        >
          <Text style={[styles.value, !value && styles.placeholder]} numberOfLines={1}>
            {value || placeholder}
          </Text>
          <Ionicons name="chevron-down" size={18} color={Brand.textMuted} />
        </Pressable>
      </FieldFrame>

      <BottomSheet visible={open} onClose={close} title={label}>
        {options.length > searchFrom ? (
          <InputField value={query} onChangeText={setQuery} placeholder="Search" autoCorrect={false} returnKeyType="search" />
        ) : null}
        <FlatList
          data={shown}
          keyExtractor={(item) => item}
          style={styles.list}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={<Text style={styles.empty}>Nothing matches.</Text>}
          renderItem={({ item }) => {
            const selected = item === value;
            return (
              <Pressable
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                onPress={() => {
                  Feedback.select();
                  onChange(item);
                  close();
                }}
                style={({ pressed }) => [styles.row, pressed && styles.pressed]}
              >
                <Text style={[styles.rowText, selected && styles.rowSelected]}>{item}</Text>
                {selected ? <Ionicons name="checkmark" size={20} color={Brand.text} /> : null}
              </Pressable>
            );
          }}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      </BottomSheet>
    </>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Brand.border,
    backgroundColor: Brand.bg,
    paddingHorizontal: Spacing.three,
    gap: Spacing.two,
  },
  boxError: { borderColor: Brand.error },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.7 },
  value: { ...Typography.body, color: Brand.text, flex: 1 },
  placeholder: { color: Brand.textFaint },
  list: { maxHeight: 380 },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 48, gap: Spacing.two },
  rowText: { ...Typography.body, color: Brand.textMuted, flex: 1 },
  rowSelected: { color: Brand.text, fontFamily: Typography.bodyStrong.fontFamily },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: Brand.border },
  empty: { ...Typography.body, color: Brand.textFaint, paddingVertical: Spacing.three },
});

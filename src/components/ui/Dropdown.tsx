import { useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { ListRow } from '@/components/ui/ListRow';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { Feedback } from '@/lib/haptics';

type Icon = keyof typeof Ionicons.glyphMap;
type Option<K extends string> = { key: K; label: string };

/** A dropdown button in a filter bar: what is picked, or the filter's name while nothing is. */
export function FilterButton({ label, active, onPress, icon }: { label: string; active: boolean; onPress: () => void; icon?: Icon }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint="Opens the choices"
      onPress={() => {
        Feedback.tap();
        onPress();
      }}
      style={({ pressed }) => [styles.button, active && styles.buttonActive, pressed && styles.pressed]}
    >
      {icon ? <Ionicons name={icon} size={14} color={active ? Brand.primarySoft : Brand.textMuted} /> : null}
      <Text style={[styles.buttonText, active && styles.buttonTextActive]} numberOfLines={1}>
        {label}
      </Text>
      <Ionicons name="chevron-down" size={14} color={active ? Brand.primarySoft : Brand.textMuted} />
    </Pressable>
  );
}

const Check = ({ on }: { on: boolean }) => (on ? <Ionicons name="checkmark" size={20} color={Brand.primarySoft} /> : <View />);

/** Choices in a sheet, the current one ticked. */
export function OptionList<K extends string>({ options, value, onPick }: { options: readonly Option<K>[]; value: K; onPick: (key: K) => void }) {
  return (
    <ScrollView style={styles.sheetList}>
      {options.map((o) => (
        <ListRow key={o.key || 'all'} title={o.label} right={<Check on={o.key === value} />} onPress={() => onPick(o.key)} />
      ))}
    </ScrollView>
  );
}

/** A sheet of choices for one filter; picking one closes it. */
export function OptionSheet<K extends string>({
  visible,
  title,
  options,
  value,
  onPick,
  onClose,
}: {
  visible: boolean;
  title: string;
  options: readonly Option<K>[];
  value: K;
  onPick: (key: K) => void;
  onClose: () => void;
}) {
  return (
    <BottomSheet visible={visible} onClose={onClose} title={title}>
      <OptionList
        options={options}
        value={value}
        onPick={(key) => {
          onPick(key);
          onClose();
        }}
      />
    </BottomSheet>
  );
}

/** A `FilterButton` and its sheet. The first option is "any", so the button lights up once something else is picked. */
export function Dropdown<K extends string>({ title, options, value, onChange, icon }: { title: string; options: readonly Option<K>[]; value: K; onChange: (key: K) => void; icon?: Icon }) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.key === value);
  return (
    <>
      <FilterButton label={current?.label ?? title} active={value !== options[0]?.key} icon={icon} onPress={() => setOpen(true)} />
      <OptionSheet visible={open} title={title} options={options} value={value} onPick={onChange} onClose={() => setOpen(false)} />
    </>
  );
}

/** Dropdowns side by side, wrapping onto a second line instead of scrolling sideways. */
export function DropdownRow({ children }: { children: ReactNode }) {
  return <View style={styles.row}>{children}</View>;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Spacing.two, paddingHorizontal: Spacing.three },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    height: 36,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.pill,
    backgroundColor: Brand.surfaceAlt,
    borderWidth: 1,
    borderColor: Brand.surfaceAlt,
  },
  buttonActive: { backgroundColor: 'rgba(180,92,242,0.18)', borderColor: 'rgba(180,92,242,0.45)' },
  buttonText: { ...Typography.caption, color: Brand.textMuted, maxWidth: 180 },
  buttonTextActive: { color: Brand.text, fontFamily: Typography.bodyStrong.fontFamily },
  pressed: { opacity: 0.7 },
  sheetList: { maxHeight: 420 },
});

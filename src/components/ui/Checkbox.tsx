import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Brand, Radius, Spacing } from '@/constants/theme';
import { Feedback } from '@/lib/haptics';

interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Accessible name when the label is composed of several elements. */
  accessibilityLabel: string;
  children: React.ReactNode;
}

/** Tick box with a rich label (text and links). Only the box toggles, so links in the label stay tappable. */
export function Checkbox({ checked, onChange, accessibilityLabel, children }: CheckboxProps) {
  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ checked }}
        hitSlop={10}
        onPress={() => {
          Feedback.select();
          onChange(!checked);
        }}
        style={[styles.box, checked && styles.boxChecked]}
      >
        {checked ? <Ionicons name="checkmark" size={16} color={Brand.text} /> : null}
      </Pressable>
      <View style={styles.label}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.three },
  box: {
    width: 22,
    height: 22,
    marginTop: 1,
    borderRadius: Radius.sm / 2,
    borderWidth: 1.5,
    borderColor: Brand.textFaint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxChecked: { backgroundColor: Brand.primaryDeep, borderColor: Brand.primaryDeep },
  label: { flex: 1 },
});

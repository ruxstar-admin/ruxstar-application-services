import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';

interface OptionCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  /** A second muted line, such as examples. */
  footnote?: string;
  selected?: boolean;
  disabled?: boolean;
  onPress: () => void;
}

/** One choice in a list of cards (categories, business types). */
export function OptionCard({ icon, title, subtitle, footnote, selected = false, disabled = false, onPress }: OptionCardProps) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.card, selected && styles.selected, disabled && styles.disabled, pressed && styles.pressed]}
    >
      <View style={[styles.icon, selected && styles.iconSelected]}>
        <Ionicons name={icon} size={22} color={selected ? Brand.onAction : Brand.text} />
      </View>
      <View style={styles.text}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
        {footnote ? <Text style={styles.footnote}>{footnote}</Text> : null}
      </View>
      <Ionicons name={selected ? 'checkmark-circle' : 'chevron-forward'} size={selected ? 22 : 18} color={selected ? Brand.text : Brand.textFaint} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Brand.border,
    backgroundColor: Brand.surface,
  },
  selected: { borderColor: Brand.text },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.7 },
  icon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: Brand.surfaceAlt },
  iconSelected: { backgroundColor: Brand.action },
  text: { flex: 1, gap: 2 },
  title: { ...Typography.bodyStrong, color: Brand.text },
  subtitle: { ...Typography.caption, fontSize: 14, color: Brand.textMuted },
  footnote: { ...Typography.caption, color: Brand.textFaint },
});

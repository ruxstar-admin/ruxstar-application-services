import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { Feedback } from '@/lib/haptics';

interface StepperProps {
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  label: string;
}

/** Minus / count / plus control for small whole numbers (copies, guests, seats). */
export function Stepper({ value, min, max, onChange, label }: StepperProps) {
  const step = (delta: number) => {
    const next = Math.min(max, Math.max(min, value + delta));
    if (next === value) return;
    Feedback.select();
    onChange(next);
  };

  return (
    <View style={styles.row} accessibilityRole="adjustable" accessibilityLabel={label} accessibilityValue={{ min, max, now: value }}>
      <Pressable accessibilityRole="button" accessibilityLabel={`Decrease ${label}`} disabled={value <= min} hitSlop={8} onPress={() => step(-1)} style={[styles.button, value <= min && styles.disabled]}>
        <Ionicons name="remove" size={20} color={Brand.text} />
      </Pressable>
      <Text style={styles.value}>{value}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={`Increase ${label}`} disabled={value >= max} hitSlop={8} onPress={() => step(1)} style={[styles.button, value >= max && styles.disabled]}>
        <Ionicons name="add" size={20} color={Brand.text} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  button: { width: 40, height: 40, borderRadius: Radius.pill, backgroundColor: Brand.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.4 },
  value: { ...Typography.bodyStrong, color: Brand.text, minWidth: 28, textAlign: 'center' },
});

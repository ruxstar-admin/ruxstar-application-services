import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { Feedback } from '@/lib/haptics';

/** Which business an order belongs to; with `onPress`, it opens that business. */
export function OrderBusiness({ label, name, onPress }: { label: string; name: string; onPress?: () => void }) {
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={`${label} ${name}${onPress ? '. Opens the business' : ''}`}
      disabled={!onPress}
      onPress={() => {
        Feedback.tap();
        onPress?.();
      }}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.icon}>
        <Ionicons name="print-outline" size={18} color={Brand.primarySoft} />
      </View>
      <View style={styles.text}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.name} numberOfLines={1}>
          {name}
        </Text>
      </View>
      {onPress ? <Ionicons name="chevron-forward" size={18} color={Brand.textMuted} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    marginTop: Spacing.two,
    borderRadius: Radius.lg,
    backgroundColor: Brand.surface,
    borderWidth: 1,
    borderColor: Brand.border,
  },
  pressed: { opacity: 0.7 },
  icon: { width: 36, height: 36, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(180,92,242,0.14)' },
  text: { flex: 1, minWidth: 0, gap: 2 },
  label: { ...Typography.caption, fontSize: 12, color: Brand.textMuted },
  name: { ...Typography.bodyStrong, color: Brand.text },
});

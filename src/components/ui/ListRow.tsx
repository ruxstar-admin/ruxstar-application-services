import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Brand, Spacing, Typography } from '@/constants/theme';
import { Feedback } from '@/lib/haptics';

interface ListRowProps {
  title: string;
  subtitle?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  /** Replaces the default chevron (e.g. a Switch or a value). */
  right?: React.ReactNode;
  onPress?: () => void;
  destructive?: boolean;
}

/** Settings / menu row: optional icon, title + subtitle, trailing slot or chevron. Pressable only when `onPress` is given. */
export function ListRow({ title, subtitle, icon, right, onPress, destructive }: ListRowProps) {
  const tint = destructive ? Brand.error : Brand.text;
  const content = (
    <>
      {icon ? <Ionicons name={icon} size={22} color={tint} style={styles.icon} /> : null}
      <View style={styles.text}>
        <Text style={[styles.title, { color: tint }]}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {right ?? (onPress ? <Ionicons name="chevron-forward" size={18} color={Brand.textFaint} /> : null)}
    </>
  );

  if (!onPress) return <View style={styles.row}>{content}</View>;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        Feedback.tap();
        onPress();
      }}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 56, paddingVertical: Spacing.two },
  pressed: { opacity: 0.6 },
  icon: { marginRight: Spacing.three },
  text: { flex: 1, gap: 2 },
  title: { ...Typography.body },
  subtitle: { ...Typography.caption, color: Brand.textMuted },
});

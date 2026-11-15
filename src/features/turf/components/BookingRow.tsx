import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Badge } from '@/components/ui/Badge';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { dayText } from '@/features/events/lib/events';
import { Feedback } from '@/lib/haptics';

interface BookingRowProps {
  /** The first date, for the day tile. */
  at: string;
  title: string;
  lines: readonly string[];
  badge?: { label: string; tone: 'neutral' | 'accent' | 'success' | 'warning' | 'error' } | null;
  onPress: () => void;
}

/** A booking in a list: the day on the left, then what and when, with a badge when it isn't simply booked. */
export function BookingRow({ at, title, lines, badge, onPress }: BookingRowProps) {
  const [, day, month] = dayText(at).replace(',', '').split(' ');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[title, ...lines, badge?.label].filter(Boolean).join(', ')}
      onPress={() => {
        Feedback.tap();
        onPress();
      }}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.date}>
        <Text style={styles.day}>{day}</Text>
        <Text style={styles.month}>{month?.toUpperCase()}</Text>
      </View>
      <View style={styles.text}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {lines.map((l) => (
          <Text key={l} style={styles.muted} numberOfLines={1}>
            {l}
          </Text>
        ))}
        {badge ? (
          <View style={styles.row}>
            <Badge label={badge.label} tone={badge.tone} />
          </View>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={Brand.textFaint} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, padding: Spacing.three, borderRadius: Radius.lg, backgroundColor: Brand.surface, borderWidth: 1, borderColor: Brand.border },
  pressed: { opacity: 0.8 },
  date: { width: 54, height: 58, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(180,92,242,0.14)' },
  day: { ...Typography.bodyStrong, fontSize: 20, lineHeight: 22, color: Brand.text },
  month: { ...Typography.caption, fontSize: 11, letterSpacing: 1, color: Brand.primarySoft },
  text: { flex: 1, gap: 2 },
  title: { ...Typography.bodyStrong, fontSize: 16, color: Brand.text },
  muted: { ...Typography.caption, color: Brand.textMuted },
  row: { flexDirection: 'row', marginTop: 2 },
});

import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Badge } from '@/components/ui/Badge';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { whenLine } from '@/features/events/lib/events';
import type { ClassView } from '@/types/coaching';
import { changeText } from '../lib/classes';

/** One class on an enrolment: when, whether it moved or was cancelled, and whether the student came. */
export function ClassRow({ cls, index }: { cls: ClassView; index: number }) {
  const cancelled = cls.status === 'cancelled';
  const change = changeText(cls);
  const mark =
    cls.attendance === 'present'
      ? { icon: 'checkmark-circle' as const, colour: Brand.success, label: 'Present' }
      : cls.attendance === 'absent'
        ? { icon: 'close-circle' as const, colour: Brand.error, label: 'Absent' }
        : null;
  return (
    <View style={[styles.row, cancelled && styles.off]} accessible accessibilityLabel={[`Class ${index}`, whenLine(cls.startsAt, cls.endsAt), change, mark?.label].filter(Boolean).join(', ')}>
      <Text style={styles.index}>{index}</Text>
      <View style={styles.text}>
        <Text style={[styles.when, cancelled && styles.struck]}>{whenLine(cls.startsAt, cls.endsAt)}</Text>
        {change ? <Text style={[styles.change, cancelled && styles.cancelled]}>{change}</Text> : null}
      </View>
      {cls.extra ? <Badge label="Extra" tone="accent" /> : null}
      {mark ? <Ionicons name={mark.icon} size={20} color={mark.colour} accessibilityLabel={mark.label} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingVertical: Spacing.two, paddingHorizontal: Spacing.three, borderRadius: Radius.md, backgroundColor: Brand.surface },
  off: { opacity: 0.7 },
  index: { ...Typography.caption, width: 22, textAlign: 'center', color: Brand.textFaint },
  text: { flex: 1, gap: 2 },
  when: { ...Typography.body, fontSize: 14, color: Brand.text },
  struck: { textDecorationLine: 'line-through', color: Brand.textMuted },
  change: { ...Typography.caption, color: Brand.warning },
  cancelled: { color: Brand.error },
});

import { memo, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { Feedback } from '@/lib/haptics';
import { dayLong, stripDays, type ClosedRules, type StripDay } from '@/lib/booking/days';

interface DateStripProps extends ClosedRules {
  /** The picked day, `YYYY-MM-DD` in India. */
  value: string;
  onChange: (day: string) => void;
  /** How many days to offer, starting today. */
  count?: number;
  /** Counts days from this moment instead of when the strip first shows. */
  now?: number;
}

/** The next couple of weeks as tappable day chips: Today, Tomorrow, then "Sat 21". Closed days are greyed and can't be picked. */
export function DateStrip({ value, onChange, count = 14, now, closedDays, closedWeekdays }: DateStripProps) {
  const [shownAt] = useState(Date.now);
  const days = useMemo(() => stripDays(count, now ?? shownAt, { closedDays, closedWeekdays }), [count, now, shownAt, closedDays, closedWeekdays]);
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scroller} contentContainerStyle={styles.row}>
      {days.map((day) => (
        <DayChip key={day.key} day={day} selected={day.key === value} onChange={onChange} />
      ))}
    </ScrollView>
  );
}

const DayChip = memo(function DayChip({ day, selected, onChange }: { day: StripDay; selected: boolean; onChange: (day: string) => void }) {
  const spoken = day.label === 'Today' || day.label === 'Tomorrow' ? `${day.label}, ${dayLong(day.key)}` : dayLong(day.key);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={day.closed ? `${spoken}, closed` : spoken}
      accessibilityState={{ selected, disabled: day.closed }}
      disabled={day.closed}
      onPress={() => {
        if (selected) return;
        Feedback.select();
        onChange(day.key);
      }}
      style={[styles.chip, selected && styles.selected, day.closed && styles.closed]}
    >
      <Text style={[styles.label, selected && styles.labelSelected, day.closed && styles.labelClosed]}>{day.label}</Text>
      {day.closed ? <Text style={styles.closedText}>Closed</Text> : null}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  scroller: { flexGrow: 0 },
  row: { gap: Spacing.two, paddingHorizontal: Spacing.three },
  chip: {
    minWidth: 72,
    minHeight: 52,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.md,
    backgroundColor: Brand.surfaceAlt,
    borderWidth: 1,
    borderColor: Brand.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selected: { backgroundColor: Brand.action, borderColor: Brand.action },
  closed: { backgroundColor: 'transparent', borderColor: Brand.border, borderStyle: 'dashed' },
  label: { ...Typography.body, fontSize: 15, color: Brand.text },
  labelSelected: { color: Brand.onAction, fontFamily: Typography.bodyStrong.fontFamily },
  labelClosed: { color: Brand.disabledText, textDecorationLine: 'line-through' },
  closedText: { ...Typography.caption, fontSize: 11, color: Brand.disabledText },
});

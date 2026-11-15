import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stepper } from '@/components/ui/Stepper';
import { ToggleRow } from '@/components/ui/ToggleRow';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { dayLabel } from '@/features/events/lib/events';
import type { WeekLine } from '../lib/repeat';

interface RepeatWeeklyProps {
  on: boolean;
  onToggle: (on: boolean) => void;
  weeks: number;
  maxWeeks: number;
  onWeeks: (weeks: number) => void;
  /** One per week, the first being the day picked above. */
  lines: readonly WeekLine[];
  /** "Saturday". */
  weekday: string;
  /** "7–9 pm", or empty before slots are picked. */
  times: string;
}

/** Book the same court and times every week: a switch, how many weeks, and each date with whether it's free. */
export function RepeatWeekly({ on, onToggle, weeks, maxWeeks, onWeeks, lines, weekday, times }: RepeatWeeklyProps) {
  return (
    <View style={styles.box}>
      <ToggleRow icon="repeat-outline" title="Repeat every week" subtitle={`Same court and time, every ${weekday}`} value={on} onValueChange={onToggle} />
      {on ? (
        <View style={styles.body}>
          <View style={styles.row}>
            <Text style={styles.label}>Weeks</Text>
            <Stepper label="weeks" value={weeks} min={2} max={maxWeeks} onChange={onWeeks} />
          </View>
          {!times ? <Text style={styles.small}>Pick slots above to check each week.</Text> : null}
          {times
            ? lines.map((l) => {
                const icon = l.checking ? 'time-outline' : l.problem ? 'alert-circle' : 'checkmark-circle';
                const colour = l.checking ? Brand.textMuted : l.problem ? Brand.warning : Brand.success;
                const state = l.checking ? 'Checking' : (l.problem ?? 'Free');
                return (
                  <View key={l.day} style={styles.week} accessible accessibilityLabel={`Week ${l.n}, ${dayLabel(l.day)}, ${times}, ${state}`}>
                    <Ionicons name={icon} size={18} color={colour} />
                    <Text style={styles.day}>{dayLabel(l.day)}</Text>
                    <Text style={[styles.state, l.problem ? styles.problem : null]} numberOfLines={2}>
                      {l.checking ? 'Checking…' : (l.problem ?? times)}
                    </Text>
                  </View>
                );
              })
            : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { borderRadius: Radius.lg, borderWidth: 1, borderColor: Brand.border, backgroundColor: Brand.surface, paddingHorizontal: Spacing.three },
  body: { gap: Spacing.two, paddingBottom: Spacing.three },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 48 },
  label: { ...Typography.bodyStrong, fontSize: 15, color: Brand.text },
  week: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, minHeight: 32 },
  day: { ...Typography.bodyStrong, fontSize: 14, color: Brand.text, width: 96 },
  state: { ...Typography.caption, fontSize: 14, color: Brand.textMuted, flex: 1 },
  problem: { color: Brand.warning },
  small: { ...Typography.caption, color: Brand.textMuted },
});

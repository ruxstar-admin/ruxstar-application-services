import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { timeAgo } from '@/lib/time';

export interface TimelineStep {
  key: string;
  label: string;
  /** ISO time when this step happened; undefined = still to come. */
  at?: string;
}

/** Vertical progress list: done steps are filled with a time, the next one is highlighted, the rest muted. */
export function StatusTimeline({ steps }: { steps: TimelineStep[] }) {
  const currentIndex = steps.findIndex((s) => !s.at);

  return (
    <View>
      {steps.map((step, i) => {
        const done = !!step.at;
        const current = i === currentIndex;
        return (
          <View key={step.key} style={styles.row}>
            <View style={styles.rail}>
              <View style={[styles.dot, done && styles.dotDone, current && styles.dotCurrent]}>
                {done ? <Ionicons name="checkmark" size={12} color={Brand.text} /> : null}
              </View>
              {i < steps.length - 1 ? <View style={[styles.line, done && styles.lineDone]} /> : null}
            </View>
            <View style={styles.text}>
              <Text style={[styles.label, !done && !current && styles.pending]}>{step.label}</Text>
              {step.at ? <Text style={styles.time}>{timeAgo(step.at)}</Text> : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: Spacing.three, minHeight: 48 },
  rail: { alignItems: 'center', width: 20 },
  dot: { width: 20, height: 20, borderRadius: Radius.pill, borderWidth: 2, borderColor: Brand.border, alignItems: 'center', justifyContent: 'center' },
  dotDone: { backgroundColor: Brand.success, borderColor: Brand.success },
  dotCurrent: { borderColor: Brand.primary },
  line: { flex: 1, width: 2, backgroundColor: Brand.border },
  lineDone: { backgroundColor: Brand.success },
  text: { flex: 1, paddingBottom: Spacing.three, flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.two },
  label: { ...Typography.body, color: Brand.text },
  pending: { color: Brand.textFaint },
  time: { ...Typography.caption, color: Brand.textMuted },
});

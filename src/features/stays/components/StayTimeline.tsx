import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import type { StepState, TimelineStep } from '../lib/stays';

const SPOKEN: Record<StepState, string> = { done: 'done', now: 'now', todo: 'to come', problem: 'needs attention' };

/** Reserved, moved in, the 24-hour check, all set: done steps ticked, the current one highlighted, a problem in red. */
export function StayTimeline({ steps }: { steps: readonly TimelineStep[] }) {
  return (
    <View>
      {steps.map((step, i) => (
        <View key={step.title} style={styles.row} accessible accessibilityLabel={`${step.title}, ${SPOKEN[step.state]}${step.detail ? `. ${step.detail}` : ''}`}>
          <View style={styles.rail}>
            <View style={[styles.dot, step.state === 'done' && styles.dotDone, step.state === 'now' && styles.dotNow, step.state === 'problem' && styles.dotProblem]}>
              {step.state === 'done' ? <Ionicons name="checkmark" size={12} color={Brand.text} /> : null}
              {step.state === 'problem' ? <Ionicons name="alert" size={12} color={Brand.text} /> : null}
            </View>
            {i < steps.length - 1 ? <View style={[styles.line, step.state === 'done' && styles.lineDone]} /> : null}
          </View>
          <View style={styles.text}>
            <Text style={[styles.title, step.state === 'todo' && styles.todo]}>{step.title}</Text>
            {step.detail ? <Text style={styles.detail}>{step.detail}</Text> : null}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: Spacing.three, minHeight: 52 },
  rail: { alignItems: 'center', width: 20 },
  dot: { width: 20, height: 20, borderRadius: Radius.pill, borderWidth: 2, borderColor: Brand.border, alignItems: 'center', justifyContent: 'center' },
  dotDone: { backgroundColor: Brand.success, borderColor: Brand.success },
  dotNow: { borderColor: Brand.primary },
  dotProblem: { backgroundColor: Brand.error, borderColor: Brand.error },
  line: { flex: 1, width: 2, backgroundColor: Brand.border },
  lineDone: { backgroundColor: Brand.success },
  text: { flex: 1, paddingBottom: Spacing.three, gap: 2 },
  title: { ...Typography.bodyStrong, fontSize: 15, color: Brand.text },
  todo: { color: Brand.textFaint },
  detail: { ...Typography.caption, color: Brand.textMuted },
});

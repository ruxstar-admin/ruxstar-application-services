import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { money } from '@/features/vendor/lib/pod';
import { Feedback } from '@/lib/haptics';
import type { Occurrence } from '@/types/turf';
import { occurrenceState, slotWhen } from '../lib/turf';

interface OccurrenceRowsProps {
  occurrences: readonly Occurrence[];
  viewer: 'customer' | 'desk';
  /** With `onPick`, rows that can be cancelled get a tick box. */
  picked?: readonly number[];
  onPick?: (picked: number[]) => void;
  /** Can this date be picked; the customer's `canCancel` by default. */
  pickable?: (o: Occurrence) => boolean;
  /** What picking it gives back, shown beside the tick. */
  refundText?: (o: Occurrence) => string | null;
}

/** The dates of a booking, one row each with its state; tick boxes when choosing which to cancel. */
export function OccurrenceRows({ occurrences, viewer, picked, onPick, pickable = (o) => o.canCancel, refundText }: OccurrenceRowsProps) {
  return (
    <View style={styles.list}>
      {occurrences.map((o) => {
        const when = slotWhen(o.startAt, o.endAt);
        const state = occurrenceState(o, viewer);
        const can = !!onPick && o.status === 'booked' && pickable(o);
        const on = can && !!picked?.includes(o.n);
        const extra = can && refundText ? refundText(o) : o.refund ? `${money(o.refund.amount)} refunded` : null;
        const body = (
          <>
            {can ? <Ionicons name={on ? 'checkbox' : 'square-outline'} size={22} color={on ? Brand.primarySoft : Brand.textMuted} /> : null}
            <View style={styles.text}>
              <Text style={[styles.when, o.status === 'cancelled' && styles.struck]}>{when}</Text>
              <Text style={styles.small}>{[state, extra].filter(Boolean).join(' · ')}</Text>
              {o.cancelReason && o.status === 'cancelled' ? <Text style={styles.small}>{o.cancelReason}</Text> : null}
            </View>
          </>
        );
        return can ? (
          <Pressable
            key={o.n}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: on }}
            accessibilityLabel={[when, state, extra].filter(Boolean).join(', ')}
            onPress={() => {
              Feedback.select();
              onPick!(on ? picked!.filter((n) => n !== o.n) : [...(picked ?? []), o.n]);
            }}
            style={({ pressed }) => [styles.row, on && styles.rowOn, pressed && styles.pressed]}
          >
            {body}
          </Pressable>
        ) : (
          <View key={o.n} style={styles.row} accessible accessibilityLabel={[when, state, extra].filter(Boolean).join(', ')}>
            {body}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: Spacing.two },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, minHeight: 56, padding: Spacing.three, borderRadius: Radius.md, backgroundColor: Brand.surface, borderWidth: 1, borderColor: Brand.border },
  rowOn: { borderColor: Brand.primary },
  pressed: { opacity: 0.8 },
  text: { flex: 1, gap: 2 },
  when: { ...Typography.bodyStrong, fontSize: 15, color: Brand.text },
  struck: { textDecorationLine: 'line-through', color: Brand.textMuted },
  small: { ...Typography.caption, color: Brand.textMuted },
});

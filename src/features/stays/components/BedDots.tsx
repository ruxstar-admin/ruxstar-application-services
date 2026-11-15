import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { Feedback } from '@/lib/haptics';
import type { BedState } from '@/types/stays';

const WORD: Record<BedState, string> = { free: 'free', taken: 'taken', closed: 'full' };

interface Dot {
  id: string;
  label: string;
  /** Unknown until a move-in date is picked. */
  state?: BedState;
}

/** A room's beds as big round dots: free ones can be tapped to pick, taken and full ones can't. */
export function BedDots({ beds, picked, onPick }: { beds: readonly Dot[]; picked?: string | null; onPick?: (bedId: string) => void }) {
  return (
    <View style={styles.row}>
      {beds.map((bed) => (
        <BedDot key={bed.id} bed={bed} picked={picked === bed.id} onPick={onPick} />
      ))}
    </View>
  );
}

const BedDot = memo(function BedDot({ bed, picked, onPick }: { bed: Dot; picked: boolean; onPick?: (bedId: string) => void }) {
  const free = bed.state === 'free';
  const pickable = !!onPick && free;
  const word = bed.state ? WORD[bed.state] : null;
  return (
    <Pressable
      accessibilityRole={onPick ? 'radio' : 'image'}
      accessibilityLabel={`Bed ${bed.label}${word ? `, ${word}` : ''}`}
      accessibilityState={onPick ? { checked: picked, disabled: !pickable } : undefined}
      disabled={!pickable}
      onPress={() => {
        Feedback.select();
        onPick?.(bed.id);
      }}
      style={({ pressed }) => [
        styles.dot,
        bed.state === 'free' && styles.free,
        bed.state === 'taken' && styles.taken,
        bed.state === 'closed' && styles.closed,
        picked && styles.picked,
        pressed && styles.pressed,
      ]}
    >
      {picked ? (
        <Ionicons name="checkmark" size={18} color={Brand.onAction} />
      ) : bed.state === 'taken' ? (
        <Ionicons name="person" size={16} color={Brand.textMuted} />
      ) : bed.state === 'closed' ? (
        <Ionicons name="lock-closed" size={14} color={Brand.textFaint} />
      ) : (
        <Text style={[styles.label, free && styles.labelFree]}>{bed.label}</Text>
      )}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  dot: {
    width: 48,
    height: 48,
    borderRadius: Radius.pill,
    borderWidth: 2,
    borderColor: Brand.border,
    backgroundColor: Brand.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  free: { borderColor: Brand.primary, backgroundColor: Brand.surface },
  taken: { borderColor: Brand.surfaceAlt },
  closed: { borderStyle: 'dashed', backgroundColor: Brand.bg },
  picked: { backgroundColor: Brand.action, borderColor: Brand.action },
  pressed: { opacity: 0.75 },
  label: { ...Typography.bodyStrong, fontSize: 15, color: Brand.textMuted },
  labelFree: { color: Brand.text },
});

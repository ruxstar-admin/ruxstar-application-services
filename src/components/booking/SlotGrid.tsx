import { memo, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { money } from '@/features/vendor/lib/pod';
import { useStableHandler } from '@/hooks/use-stable-handler';
import { clockText, isPickable, rangeText, toggleSlot, type Slot } from '@/lib/booking/slots';
import { Feedback } from '@/lib/haptics';
import { CELL_LOOK } from './look';

interface SlotGridProps {
  /** One day's slots in time order, for one court. */
  slots: readonly Slot[];
  /** Picked slot keys, always back to back. */
  selected: string[];
  onChange: (selected: string[]) => void;
  columns?: number;
  emptyText?: string;
}

/**
 * A day's slots as a grid of cells with time, price and state. Tapping keeps the pick back to back: next to it extends,
 * elsewhere starts again, an end shrinks it. For several courts, put `ChoiceChips` of courts above and pass that court's slots.
 */
export function SlotGrid({ slots, selected, onChange, columns = 3, emptyText = 'No slots on this day. Try another date.' }: SlotGridProps) {
  const rows = useMemo(() => {
    const out: Slot[][] = [];
    for (let i = 0; i < slots.length; i += columns) out.push(slots.slice(i, i + columns));
    return out;
  }, [slots, columns]);
  const picked = useMemo(() => new Set(selected), [selected]);

  const press = useStableHandler((key: string) => {
    const next = toggleSlot(slots, selected, key);
    if (next.length === selected.length && next.every((k, i) => k === selected[i])) return;
    Feedback.select();
    onChange(next);
  });

  if (!slots.length) return <Text style={styles.empty}>{emptyText}</Text>;

  return (
    <View style={styles.grid}>
      {rows.map((row) => (
        <View key={row[0]!.key} style={styles.row}>
          {row.map((slot) => (
            <SlotCell key={slot.key} slot={slot} picked={picked.has(slot.key)} onPress={press} />
          ))}
          {Array.from({ length: columns - row.length }, (_, i) => (
            <View key={`gap${i}`} style={styles.spacer} />
          ))}
        </View>
      ))}
    </View>
  );
}

const SlotCell = memo(function SlotCell({ slot, picked, onPress }: { slot: Slot; picked: boolean; onPress: (key: string) => void }) {
  const look = CELL_LOOK[picked ? 'selected' : slot.state];
  const open = isPickable(slot);
  const tag = picked ? 'Selected' : slot.state === 'few' && slot.left ? `${slot.left} left` : look.label;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${rangeText(slot.start, slot.end)}, ${open ? money(slot.price) : look.label}${open && slot.state !== 'free' ? `, ${tag}` : ''}`}
      accessibilityHint={open ? (picked ? 'Removes this slot' : 'Picks this slot') : undefined}
      accessibilityState={{ selected: picked, disabled: !open }}
      disabled={!open}
      onPress={() => onPress(slot.key)}
      style={({ pressed }) => [styles.cell, { backgroundColor: look.bg, borderColor: look.border }, look.dashed && styles.dashed, pressed && styles.pressed]}
    >
      <Text style={[styles.time, { color: look.text }]}>{clockText(slot.start)}</Text>
      <Text style={[styles.price, { color: look.text }, !open && styles.struck]}>{money(slot.price)}</Text>
      <View style={styles.tag}>
        <Ionicons name={look.icon} size={12} color={look.iconColor} />
        <Text style={[styles.tagText, { color: picked ? Brand.text : look.iconColor }]} numberOfLines={1}>
          {tag}
        </Text>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  grid: { gap: Spacing.two },
  row: { flexDirection: 'row', gap: Spacing.two },
  spacer: { flex: 1 },
  cell: { flex: 1, minHeight: 76, paddingVertical: Spacing.two, paddingHorizontal: Spacing.two, borderRadius: Radius.md, borderWidth: 1, gap: 2 },
  dashed: { borderStyle: 'dashed' },
  pressed: { opacity: 0.75 },
  time: { ...Typography.bodyStrong, fontSize: 15 },
  price: { ...Typography.caption, fontSize: 13 },
  struck: { textDecorationLine: 'line-through' },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  tagText: { ...Typography.caption, fontSize: 11 },
  empty: { ...Typography.body, fontSize: 15, color: Brand.textMuted, paddingVertical: Spacing.three, textAlign: 'center' },
});

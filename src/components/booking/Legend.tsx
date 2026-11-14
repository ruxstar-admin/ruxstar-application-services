import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import type { BoardState } from '@/lib/booking/board';
import { CELL_LOOK } from './look';

const DEFAULT_ITEMS: readonly BoardState[] = ['free', 'selected', 'booked', 'blocked', 'peak'];

interface LegendProps {
  /** Which states to explain, in order. */
  items?: readonly BoardState[];
}

/** The key under a slot grid or board: a swatch with its icon and a word for each state. */
export function Legend({ items = DEFAULT_ITEMS }: LegendProps) {
  return (
    <View style={styles.row} accessible accessibilityLabel={`Key: ${items.map((s) => CELL_LOOK[s].label).join(', ')}`}>
      {items.map((state) => {
        const look = CELL_LOOK[state];
        return (
          <View key={state} style={styles.item}>
            <View style={[styles.swatch, { backgroundColor: look.bg, borderColor: look.border }, look.dashed && styles.dashed]}>
              <Ionicons name={look.icon} size={12} color={look.iconColor} />
            </View>
            <Text style={styles.label}>{look.label}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', columnGap: Spacing.three, rowGap: Spacing.two },
  item: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  swatch: { width: 20, height: 20, borderRadius: Radius.sm / 2, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  dashed: { borderStyle: 'dashed' },
  label: { ...Typography.caption, color: Brand.textMuted },
});

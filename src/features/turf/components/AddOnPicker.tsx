import { StyleSheet, Text, View } from 'react-native';
import { Stepper } from '@/components/ui/Stepper';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { money } from '@/features/vendor/lib/pod';
import type { AddOn } from '@/types/turf';
import type { AddOnCounts } from '../lib/price';

/** The most of one add-on on a booking. */
const MAX_QUANTITY = 20;

/** Extras the court offers, each with a count: balls, bibs, a coach. */
export function AddOnPicker({ addOns, counts, onChange }: { addOns: readonly AddOn[]; counts: AddOnCounts; onChange: (counts: AddOnCounts) => void }) {
  return (
    <View style={styles.list}>
      {addOns.map((a) => (
        <View key={a.id} style={styles.row}>
          <View style={styles.text}>
            <Text style={styles.name}>{a.name}</Text>
            <Text style={styles.small}>{`${a.price ? money(a.price) : 'Free'} ${a.per === 'slot' ? 'a slot' : 'a booking'}`}</Text>
          </View>
          <Stepper label={a.name} value={counts[a.id] ?? 0} min={0} max={MAX_QUANTITY} onChange={(n) => onChange({ ...counts, [a.id]: n })} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { borderRadius: Radius.lg, borderWidth: 1, borderColor: Brand.border, backgroundColor: Brand.surface, paddingHorizontal: Spacing.three },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, minHeight: 64, paddingVertical: Spacing.two },
  text: { flex: 1, gap: 2 },
  name: { ...Typography.bodyStrong, fontSize: 15, color: Brand.text },
  small: { ...Typography.caption, color: Brand.textMuted },
});

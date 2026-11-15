import { StyleSheet, Text, View } from 'react-native';
import { ChoiceChips } from '@/components/ui/ChoiceChips';
import { InputField } from '@/components/ui/InputField';
import { KeyedSelectField } from '@/components/ui/KeyedSelectField';
import { MultiChoiceChips } from '@/components/ui/MultiChoiceChips';
import { TextLink } from '@/components/ui/TextLink';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { HALF_HOURS } from '@/features/events/lib/events';
import type { AddOnPer } from '@/types/turf';
import { newAddOn, newPeak, type AddOnDraft, type CourtDraft, type CourtErrors, type PeakDraft } from '../lib/forms';
import { WEEK_ORDER, WEEKDAY_SHORT } from '../lib/turf';

const MAX_PEAKS = 5;

/** Opening and closing times: every half hour, and midnight to close at the end of the day. */
export const OPEN_TIMES = HALF_HOURS;
export const CLOSE_TIMES = [...HALF_HOURS.slice(1), { key: '24:00', label: 'Midnight' }];

const DAY_CHIPS = WEEK_ORDER.map((d) => ({ key: String(d), label: WEEKDAY_SHORT[d] }));
const PER_CHIPS: { key: AddOnPer; label: string }[] = [
  { key: 'booking', label: 'Once a booking' },
  { key: 'slot', label: 'For each slot' },
];

type PriceDraft = Pick<CourtDraft, 'base' | 'weekend' | 'peaks'>;
type PriceErrors = Pick<CourtErrors, 'base' | 'weekend' | 'peaks'>;

function PeakCard({ peak, error, onChange, onRemove }: { peak: PeakDraft; error?: string; onChange: (p: PeakDraft) => void; onRemove: () => void }) {
  return (
    <View style={styles.card}>
      <MultiChoiceChips options={DAY_CHIPS} value={peak.days.map(String)} onChange={(v) => onChange({ ...peak, days: v.map(Number) })} />
      <View style={styles.pair}>
        <View style={styles.half}>
          <KeyedSelectField label="From" value={peak.start} options={OPEN_TIMES} onChange={(v) => onChange({ ...peak, start: v })} />
        </View>
        <View style={styles.half}>
          <KeyedSelectField label="Until" value={peak.end} options={CLOSE_TIMES} onChange={(v) => onChange({ ...peak, end: v })} />
        </View>
      </View>
      <InputField label="Peak price per slot (₹)" value={peak.price} onChangeText={(v) => onChange({ ...peak, price: v })} keyboardType="decimal-pad" error={error} />
      <TextLink muted label="Remove this peak time" onPress={onRemove} />
    </View>
  );
}

/** Base, weekend and peak prices of a court. */
export function PricesEditor({ draft, errors, onChange }: { draft: PriceDraft; errors?: PriceErrors; onChange: (changes: Partial<PriceDraft>) => void }) {
  const setPeak = (i: number, p: PeakDraft) => onChange({ peaks: draft.peaks.map((x, j) => (j === i ? p : x)) });
  return (
    <>
      <View style={styles.pair}>
        <View style={styles.half}>
          <InputField label="Price per slot (₹)" value={draft.base} onChangeText={(v) => onChange({ base: v })} keyboardType="decimal-pad" error={errors?.base} />
        </View>
        <View style={styles.half}>
          <InputField label="Sat and Sun (₹)" value={draft.weekend} onChangeText={(v) => onChange({ weekend: v })} keyboardType="decimal-pad" hint="Empty for the same price" error={errors?.weekend} />
        </View>
      </View>
      <Text style={styles.label}>Peak times</Text>
      <Text style={styles.hint}>A slot that starts in a peak time costs the peak price, even at the weekend.</Text>
      {draft.peaks.map((p, i) => (
        <PeakCard key={i} peak={p} error={errors?.peaks[i]} onChange={(next) => setPeak(i, next)} onRemove={() => onChange({ peaks: draft.peaks.filter((_, j) => j !== i) })} />
      ))}
      {draft.peaks.length < MAX_PEAKS ? <TextLink label="Add a peak time" onPress={() => onChange({ peaks: [...draft.peaks, newPeak()] })} /> : null}
    </>
  );
}

/** Extras players can add to a booking, like a ball or bibs. */
export function AddOnsEditor({ addOns, errors, max, onChange }: { addOns: AddOnDraft[]; errors?: Record<number, string>; max: number; onChange: (addOns: AddOnDraft[]) => void }) {
  const set = (i: number, a: AddOnDraft) => onChange(addOns.map((x, j) => (j === i ? a : x)));
  return (
    <>
      <Text style={styles.label}>Add-ons</Text>
      <Text style={styles.hint}>Extras players can add when they book, like a ball, bibs or rackets.</Text>
      {addOns.map((a, i) => (
        <View key={a.id ?? `new-${i}`} style={styles.card}>
          <View style={styles.pair}>
            <View style={styles.wide}>
              <InputField label="Name" value={a.name} onChangeText={(v) => set(i, { ...a, name: v })} maxLength={40} placeholder="Like “Football”" />
            </View>
            <View style={styles.half}>
              <InputField label="Price (₹)" value={a.price} onChangeText={(v) => set(i, { ...a, price: v })} keyboardType="decimal-pad" />
            </View>
          </View>
          <View style={styles.bleed}>
            <ChoiceChips options={PER_CHIPS} value={a.per} onChange={(v: AddOnPer) => set(i, { ...a, per: v })} />
          </View>
          {errors?.[i] ? <Text style={styles.error}>{errors[i]}</Text> : null}
          <TextLink muted label="Remove this add-on" onPress={() => onChange(addOns.filter((_, j) => j !== i))} />
        </View>
      ))}
      {addOns.length < max ? <TextLink label="Add an add-on" onPress={() => onChange([...addOns, newAddOn()])} /> : null}
    </>
  );
}

const styles = StyleSheet.create({
  label: { ...Typography.bodyStrong, fontSize: 15, color: Brand.text },
  hint: { ...Typography.caption, color: Brand.textMuted },
  error: { ...Typography.caption, color: Brand.error },
  pair: { flexDirection: 'row', gap: Spacing.two },
  half: { flex: 1 },
  wide: { flex: 2 },
  bleed: { marginHorizontal: -Spacing.three },
  card: { gap: Spacing.two, padding: Spacing.three, borderRadius: Radius.lg, backgroundColor: Brand.surface, borderWidth: 1, borderColor: Brand.border },
});

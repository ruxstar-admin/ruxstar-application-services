import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ChoiceChips } from '@/components/ui/ChoiceChips';
import { InputField } from '@/components/ui/InputField';
import { MultiChoiceChips } from '@/components/ui/MultiChoiceChips';
import { ToggleRow } from '@/components/ui/ToggleRow';
import { Brand, Spacing, Typography } from '@/constants/theme';
import { formatDay, upcomingDays } from '@/lib/dates';
import { cleanAmount, cleanCode, cleanCount, type CouponDraft, type DraftErrors } from '../lib/coupons';

const START_DAYS = 60;
const END_DAYS = 180;

interface CouponFieldsProps {
  draft: CouponDraft;
  onChange: (next: CouponDraft) => void;
  errors: DraftErrors;
  /** Making a new coupon: the code and discount can be set. Afterwards they are fixed. */
  creating: boolean;
  /** A coupon that hasn't started can still move its start. */
  canMoveStart: boolean;
  /** Vendors pick which of their print shops it works at. */
  shops?: { id: string; name: string }[];
}

function Label({ children, hint, error }: { children: string; hint?: string; error?: string }) {
  return (
    <View style={styles.labelBox}>
      <Text style={styles.label}>{children}</Text>
      {error || hint ? <Text style={[styles.hint, error ? styles.error : null]}>{error ?? hint}</Text> : null}
    </View>
  );
}

/** The coupon form's fields. Amounts are typed in rupees; the draft keeps them as typed. */
export function CouponFields({ draft, onChange, errors, creating, canMoveStart, shops }: CouponFieldsProps) {
  const set = <K extends keyof CouponDraft>(key: K, value: CouponDraft[K]) => onChange({ ...draft, [key]: value });
  const percent = draft.kind === 'percent';

  const startOptions = useMemo(() => {
    const days = upcomingDays(START_DAYS).map((d, i) => (i === 0 ? { key: '', label: 'Today' } : d));
    return draft.starts && !days.some((d) => d.key === draft.starts) ? [{ key: draft.starts, label: formatDay(draft.starts) }, ...days] : days;
  }, [draft.starts]);
  const endOptions = useMemo(() => {
    const days = upcomingDays(END_DAYS).filter((d) => !draft.starts || d.key >= draft.starts);
    const all = [{ key: '', label: 'No end date' }, ...days];
    return draft.ends && !days.some((d) => d.key === draft.ends) ? [...all, { key: draft.ends, label: formatDay(draft.ends) }] : all;
  }, [draft.starts, draft.ends]);

  return (
    <View style={styles.container}>
      {creating ? (
        <>
          <InputField
            label="Code"
            value={draft.code}
            onChangeText={(t) => set('code', cleanCode(t))}
            autoCapitalize="characters"
            autoCorrect={false}
            placeholder="WELCOME20"
            hint="What customers type. 4 to 16 letters and digits. It can't change later."
            error={draft.code ? errors.code : undefined}
          />
          <Label>Discount</Label>
          <View style={styles.bleed}>
            <ChoiceChips
              secondary
              value={draft.kind}
              onChange={(kind) => onChange({ ...draft, kind, value: '', cap: '' })}
              options={[
                { key: 'percent', label: 'Percent off' },
                { key: 'flat', label: 'Amount off' },
              ]}
            />
          </View>
          <View style={styles.pair}>
            <View style={styles.flex}>
              <InputField
                label={percent ? 'Percent off' : 'Amount off (₹)'}
                value={draft.value}
                onChangeText={(t) => set('value', percent ? cleanCount(t).slice(0, 3) : cleanAmount(t))}
                keyboardType={percent ? 'number-pad' : 'decimal-pad'}
                error={draft.value ? errors.value : undefined}
              />
            </View>
            {percent ? (
              <View style={styles.flex}>
                <InputField label="Most off (₹)" value={draft.cap} onChangeText={(t) => set('cap', cleanAmount(t))} keyboardType="decimal-pad" placeholder="No most" error={errors.cap} />
              </View>
            ) : null}
          </View>
        </>
      ) : null}

      {shops ? (
        <>
          <Label error={errors.shops}>Works at</Label>
          <MultiChoiceChips options={shops.map((s) => ({ key: s.id, label: s.name }))} value={draft.businessIds} onChange={(ids) => set('businessIds', ids)} />
        </>
      ) : null}

      <InputField
        label="Smallest order (₹)"
        value={draft.minOrder}
        onChangeText={(t) => set('minOrder', cleanAmount(t))}
        keyboardType="decimal-pad"
        placeholder="None"
        hint="Of the items, before the discount and the platform fee"
        error={errors.minOrder}
      />

      {creating || canMoveStart ? (
        <>
          <Label>Starts</Label>
          <View style={styles.bleed}>
            <ChoiceChips secondary value={draft.starts} onChange={(starts) => onChange({ ...draft, starts, ends: draft.ends && draft.ends < starts ? '' : draft.ends })} options={startOptions} />
          </View>
        </>
      ) : null}
      <Label hint="It works until the end of that day" error={errors.ends}>
        Ends
      </Label>
      <View style={styles.bleed}>
        <ChoiceChips secondary value={draft.ends} onChange={(ends) => set('ends', ends)} options={endOptions} />
      </View>

      <View style={styles.pair}>
        <View style={styles.flex}>
          <InputField label="Total uses" value={draft.limit} onChangeText={(t) => set('limit', cleanCount(t))} keyboardType="number-pad" placeholder="No limit" error={errors.limit} />
        </View>
        <View style={styles.flex}>
          <InputField
            label="Uses per customer"
            value={draft.perCustomer}
            onChangeText={(t) => set('perCustomer', cleanCount(t).slice(0, 3))}
            keyboardType="number-pad"
            placeholder="No limit"
            error={errors.perCustomer}
          />
        </View>
      </View>

      <View style={styles.toggles}>
        <ToggleRow title="First order only" subtitle="For customers who haven't ordered before" value={draft.firstOrderOnly} onValueChange={(v) => set('firstOrderOnly', v)} />
        <ToggleRow
          title="Show at checkout"
          subtitle="Off: only people you give the code to can use it"
          value={draft.listed}
          onValueChange={(v) => set('listed', v)}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.two },
  flex: { flex: 1 },
  pair: { flexDirection: 'row', gap: Spacing.two },
  bleed: { marginHorizontal: -Spacing.three },
  labelBox: { gap: 2, marginTop: Spacing.one },
  label: { ...Typography.bodyStrong, fontSize: 14, color: Brand.text },
  hint: { ...Typography.caption, fontSize: 12, color: Brand.textFaint },
  error: { color: Brand.error },
  toggles: { marginTop: Spacing.one },
});

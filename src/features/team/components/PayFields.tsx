import { StyleSheet, Text, View } from 'react-native';
import { ChoiceChips } from '@/components/ui/ChoiceChips';
import { InputField } from '@/components/ui/InputField';
import { Brand, Spacing, Typography } from '@/constants/theme';
import { paiseOf, rupeeInput, rupeesText } from '@/features/vendor/lib/pod';
import type { Pay, PayPer } from '@/types/team';
import { PAY_NOTE_MAX, PAY_PER } from '../lib/team';

/** What the owner is typing. An empty amount means no pay on the offer. */
export interface PayDraft {
  amount: string;
  per: PayPer;
  note: string;
}

export const payDraft = (pay: Pay | null): PayDraft => ({ amount: rupeesText(pay?.amount), per: pay?.per ?? 'month', note: pay?.note ?? '' });

export function payOfDraft(draft: PayDraft): Pay | null {
  const amount = paiseOf(draft.amount);
  return amount ? { amount, per: draft.per, note: draft.note.trim() || null } : null;
}

/** Under ₹1 can't be sent; empty is fine, since pay is optional. */
export const payDraftOk = (draft: PayDraft) => !draft.amount.trim() || (paiseOf(draft.amount) ?? 0) >= 100;

/** Pay on a team invite: an amount, how often, and an optional note. All optional. */
export function PayFields({ value, onChange, error }: { value: PayDraft; onChange: (next: PayDraft) => void; error?: string }) {
  const tooLow = !payDraftOk(value);
  return (
    <View style={styles.gap}>
      <Text style={styles.section}>Pay (optional)</Text>
      <Text style={styles.hint}>They see it with the invite, so they can compare offers. You pay them yourself; Ruxstar only shows it.</Text>
      <InputField
        label="Amount (₹)"
        value={value.amount}
        onChangeText={(t) => onChange({ ...value, amount: rupeeInput(t) })}
        keyboardType="decimal-pad"
        placeholder="15000"
        error={error ?? (tooLow ? 'Enter at least ₹1, or leave it empty' : undefined)}
      />
      {value.amount.trim() ? (
        <>
          <Text style={styles.label}>Paid per</Text>
          <ChoiceChips options={PAY_PER} value={value.per} onChange={(per) => onChange({ ...value, per })} secondary />
          <InputField
            label="Note (optional)"
            value={value.note}
            onChangeText={(note) => onChange({ ...value, note })}
            placeholder="Plus petrol allowance"
            maxLength={PAY_NOTE_MAX}
          />
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  gap: { gap: Spacing.two },
  section: { ...Typography.bodyStrong, color: Brand.text, marginTop: Spacing.three },
  label: { ...Typography.caption, fontSize: 14, color: Brand.textMuted },
  hint: { ...Typography.caption, color: Brand.textFaint },
});

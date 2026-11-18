import { useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { InputField } from '@/components/ui/InputField';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { SegmentedTabs } from '@/components/ui/SegmentedTabs';
import { Brand, Spacing, Typography } from '@/constants/theme';
import { maxPartRefund } from '@/features/gigs/lib/gigs';
import { money, paiseOf, rupeeInput } from '@/features/vendor/lib/pod';
import type { DecideInput, DisputeOutcome, GigOrder } from '@/types/gigs';

const OUTCOMES = [
  { key: 'full', label: 'Full refund' },
  { key: 'part', label: 'Part refund' },
  { key: 'none', label: 'No refund' },
] as const satisfies readonly { key: DisputeOutcome; label: string }[];

const SAYS: Record<DisputeOutcome, (o: GigOrder) => string> = {
  full: (o) => `${o.customer.name} gets ${money(o.price.total)} back, platform fee included, and the order is cancelled. ${o.freelancer.name} isn’t paid.`,
  part: (o) => `${o.customer.name} gets the amount back out of ${o.freelancer.name}’s share; the rest of the share is paid to them and the order completes.`,
  none: (o) => `${o.freelancer.name} is paid ${money(o.share ?? 0)} and the order completes.`,
};

/** Deciding a reported problem: a full, part or no refund, with a note both sides read. */
export function DecideGigSheet({
  order,
  visible,
  busy,
  failure,
  onConfirm,
  onCancel,
}: {
  order: GigOrder;
  visible: boolean;
  busy: boolean;
  failure: string | null;
  onConfirm: (body: DecideInput) => void;
  onCancel: () => void;
}) {
  const [outcome, setOutcome] = useState<DisputeOutcome>('part');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const most = maxPartRefund(order);
  const paise = paiseOf(amount);
  const amountProblem = outcome !== 'part' ? null : paise === null || paise < 1 ? 'Enter the amount to refund.' : paise > most ? `At most ${money(most)}.` : null;
  const ready = note.trim().length >= 5 && !amountProblem && (outcome !== 'part' || most > 0);

  return (
    <BottomSheet visible={visible} onClose={onCancel} title="Decide this problem">
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <SegmentedTabs options={OUTCOMES} value={outcome} onChange={setOutcome} />
        <Text style={styles.message}>{SAYS[outcome](order)}</Text>
        {outcome === 'part' ? (
          most > 0 ? (
            <InputField
              label="Refund (₹)"
              value={amount}
              onChangeText={(v) => setAmount(rupeeInput(v))}
              keyboardType="decimal-pad"
              hint={`Up to ${money(most)}`}
              error={amount ? (amountProblem ?? undefined) : undefined}
            />
          ) : (
            <Text style={styles.message}>There’s nothing left to refund in part. Pick full or none.</Text>
          )
        ) : null}
        <InputField label="Note for both sides" value={note} onChangeText={setNote} multiline maxLength={1000} showCount placeholder="What you looked at and why you decided this" />
        {failure ? <ErrorBanner message={failure} /> : null}
      </ScrollView>
      <PrimaryButton
        label="Decide"
        loading={busy}
        disabled={!ready}
        onPress={() => onConfirm({ outcome, ...(outcome === 'part' && paise !== null ? { amount: paise } : {}), note: note.trim() })}
      />
      <PrimaryButton label="Cancel" variant="outline" onPress={onCancel} disabled={busy} />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  scroll: { maxHeight: 420 },
  content: { gap: Spacing.two },
  message: { ...Typography.body, color: Brand.textMuted },
});

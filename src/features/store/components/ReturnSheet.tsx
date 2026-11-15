import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { ChoiceChips } from '@/components/ui/ChoiceChips';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { InputField } from '@/components/ui/InputField';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Stepper } from '@/components/ui/Stepper';
import { Brand, Spacing, Typography } from '@/constants/theme';
import { Card, PriceLine } from '@/features/coaching/components/Parts';
import { money } from '@/features/vendor/lib/pod';
import type { ReturnReason, StoreOrder } from '@/types/store';
import { RETURN_REASONS, returnSplit, tripText } from '../lib/store';
import { optionsText } from '../lib/variants';

export interface ReturnAsk {
  reason: ReturnReason;
  note?: string;
  /** Left out when everything goes back. */
  lines?: { lineId: string; quantity: number }[];
}

interface ReturnSheetProps {
  order: StoreOrder;
  visible: boolean;
  busy: boolean;
  failure: string | null;
  onCancel: () => void;
  onConfirm: (ask: ReturnAsk) => void;
}

/** Asking for a return: why, which items and how many, a note, and what comes back after the trip fee. */
export function ReturnSheet({ order, visible, busy, failure, onCancel, onConfirm }: ReturnSheetProps) {
  const [reason, setReason] = useState<ReturnReason>('wrong_item');
  const [counts, setCounts] = useState<Record<string, number>>(() => Object.fromEntries(order.lines.map((l) => [l.id, l.quantity])));
  const [note, setNote] = useState('');

  const picked = order.lines.map((l) => ({ lineId: l.id, quantity: counts[l.id] ?? 0 })).filter((p) => p.quantity > 0);
  const everything = order.lines.every((l) => (counts[l.id] ?? 0) === l.quantity);
  const split = returnSplit(order, picked, reason);
  const needsNote = reason === 'other' && note.trim().length < 5;

  const send = () => onConfirm({ reason, ...(note.trim() ? { note: note.trim() } : {}), ...(everything ? {} : { lines: picked }) });

  return (
    <BottomSheet visible={visible} onClose={onCancel} title="Return items">
      <Text style={styles.muted}>Why are you returning it?</Text>
      <View style={styles.bleed}>
        <ChoiceChips options={RETURN_REASONS} value={reason} onChange={setReason} />
      </View>
      <Text style={styles.small}>{tripText(reason, order.method, order.price.delivery)}</Text>

      {order.lines.length > 1 || order.lines[0]!.quantity > 1 ? (
        <ScrollView style={styles.lines} contentContainerStyle={styles.linesBody}>
          {order.lines.map((l) => {
            const options = optionsText(l.options);
            return (
              <View key={l.id} style={styles.line}>
                <View style={styles.flex}>
                  <Text style={styles.strong} numberOfLines={1}>
                    {l.title}
                  </Text>
                  <Text style={styles.small}>{[options, `${money(l.unitPrice)} each`].filter(Boolean).join(' · ')}</Text>
                </View>
                <Stepper value={counts[l.id] ?? 0} min={0} max={l.quantity} onChange={(q) => setCounts((now) => ({ ...now, [l.id]: q }))} label={`${l.title} to return`} />
              </View>
            );
          })}
        </ScrollView>
      ) : null}

      <InputField
        label={reason === 'other' ? 'What’s wrong?' : 'Anything to add? (optional)'}
        value={note}
        onChangeText={setNote}
        maxLength={500}
        multiline
        placeholder="Like “The size runs small” or “The box was crushed”"
      />

      {picked.length ? (
        <Card>
          <PriceLine label="Items going back" amount={split.value} />
          {split.discount ? <PriceLine label="Their part of the offer" amount={split.discount} minus /> : null}
          {split.tripFee ? <PriceLine label="Trip back" amount={split.tripFee} minus /> : null}
          <PriceLine label="You get back" amount={split.amount} strong />
        </Card>
      ) : (
        <Text style={styles.small}>Pick at least one item to return.</Text>
      )}
      <Text style={styles.small}>The shop has a look first. The money comes back once the items reach the shop.</Text>
      {failure ? <ErrorBanner message={failure} /> : null}
      <PrimaryButton label="Ask for a return" onPress={send} loading={busy} disabled={!picked.length || needsNote} />
      <PrimaryButton label="Not now" variant="outline" onPress={onCancel} disabled={busy} />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  bleed: { marginHorizontal: -Spacing.three },
  muted: { ...Typography.body, color: Brand.textMuted },
  small: { ...Typography.caption, color: Brand.textMuted },
  strong: { ...Typography.bodyStrong, fontSize: 15, color: Brand.text },
  lines: { maxHeight: 220, flexGrow: 0 },
  linesBody: { gap: Spacing.three },
  line: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  flex: { flex: 1, gap: 2 },
});

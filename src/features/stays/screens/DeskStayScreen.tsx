import { useCallback, useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { AsyncBoundary } from '@/components/ui/AsyncBoundary';
import { Badge } from '@/components/ui/Badge';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { ConfirmSheet } from '@/components/ui/ConfirmSheet';
import { DayPicker } from '@/components/ui/DayTimePicker';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { InputField } from '@/components/ui/InputField';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ReasonSheet } from '@/components/ui/ReasonSheet';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { TextLink } from '@/components/ui/TextLink';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { Card, Notice, Section } from '@/features/coaching/components/Parts';
import { discountLine } from '@/features/coupons/lib/coupons';
import { errorText } from '@/features/events/lib/messages';
import { money } from '@/features/vendor/lib/pod';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { useAuthToken } from '@/hooks/use-auth-token';
import { useRefetchOnFocus } from '@/hooks/use-refetch-on-focus';
import { newIdempotencyKey } from '@/lib/api-client';
import { istDayKey } from '@/lib/booking/days';
import { nightsBetween } from '@/lib/dates';
import { Feedback } from '@/lib/haptics';
import { StaysDeskService } from '@/services/stays-service';
import type { DeskProperty, DeskReservation } from '@/types/stays';
import { StayTimeline } from '../components/StayTimeline';
import { PAYOUT_LABEL, STAY_STATUS, bedsText, cancelText, dayShort, deskCan, momentText, stayText, stayTimeline } from '../lib/stays';

/** How far ahead a monthly stay's move-out can be set when it has no end yet. */
const MOVE_OUT_SPAN_DAYS = 90;

function MoveOutSheet({ stay, visible, busy, failure, onCancel, onConfirm }: { stay: DeskReservation; visible: boolean; busy: boolean; failure: string | null; onCancel: () => void; onConfirm: (on: string, reason: string) => void }) {
  const [today] = useState(() => istDayKey(Date.now()));
  const from = stay.moveIn > today ? stay.moveIn : today;
  const last = stay.moveOut?.on ?? stay.until;
  const days = last ? Math.max(1, nightsBetween(from, last) + 1) : MOVE_OUT_SPAN_DAYS;
  const [on, setOn] = useState(from);
  const [reason, setReason] = useState('');
  const [shown, setShown] = useState(visible);
  if (visible !== shown) {
    setShown(visible);
    if (visible) {
      setOn(from);
      setReason('');
    }
  }
  return (
    <BottomSheet visible={visible} onClose={onCancel} title="Mark the move-out">
      <Text style={styles.muted}>Pick the day the bed is free again. Today ends the stay now; a later day sets it as their move-out. A stay can be shortened, never made longer.</Text>
      <DayPicker value={on} onChange={setOn} from={from} days={days} />
      <InputField label="Note for the tenant (optional)" value={reason} onChangeText={setReason} maxLength={300} placeholder="Like “Moved out early, keys returned”" />
      {failure ? <ErrorBanner message={failure} /> : null}
      <PrimaryButton label={on === today ? 'Moved out today' : `Moving out ${dayShort(on)}`} loading={busy} onPress={() => onConfirm(on, reason.trim())} />
      <PrimaryButton label="Not now" variant="outline" onPress={onCancel} disabled={busy} />
    </BottomSheet>
  );
}

type Sheet = 'movein' | 'moveout' | 'cancel' | null;

function StayView({ stay, property, now, setStay, reload }: { stay: DeskReservation; property: DeskProperty | null; now: number; setStay: (s: DeskReservation) => void; reload: () => void }) {
  const token = useAuthToken();
  const [sheet, setSheet] = useState<Sheet>(null);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [sheetFailure, setSheetFailure] = useState<string | null>(null);
  const status = STAY_STATUS[stay.status];
  const canMove = deskCan(property, 'stays.movein');
  const objection = stay.objection;
  const cancelled = stay.status === 'cancelled';

  const run = async (action: () => Promise<DeskReservation>) => {
    setBusy(true);
    setSheetFailure(null);
    try {
      setStay(await action());
      Feedback.success();
      setSheet(null);
    } catch (err) {
      Feedback.error();
      if (sheet === 'movein') {
        setSheet(null);
        setFailure(errorText(err));
      } else setSheetFailure(errorText(err));
    } finally {
      setBusy(false);
    }
  };
  const open = (next: Sheet) => {
    setSheetFailure(null);
    setFailure(null);
    setSheet(next);
  };

  const footer =
    canMove && stay.canMoveIn ? (
      <PrimaryButton label="Moved in" onPress={() => open('movein')} />
    ) : canMove && stay.canMoveOut ? (
      <PrimaryButton label="Mark the move-out" variant="outline" onPress={() => open('moveout')} />
    ) : null;

  return (
    <ScreenContainer title={`Reservation #${stay.orderNo}`} footer={footer}>
      <View style={styles.head}>
        <View style={styles.headText}>
          <Text style={styles.title}>{stay.tenant.name}</Text>
          <Text style={styles.muted}>{bedsText(stay)}</Text>
          <Text style={styles.muted}>{stayText(stay)}</Text>
        </View>
        <Badge label={status.label} tone={status.tone} />
      </View>
      <Text style={stay.tenant.verified ? styles.verified : styles.muted}>{stay.tenant.verified ? 'ID verified with Ruxstar' : 'ID not verified yet'}</Text>
      {stay.tenant.phone ? <TextLink label={`Call ${stay.tenant.phone}`} onPress={() => Linking.openURL(`tel:${stay.tenant.phone}`)} /> : null}

      {cancelled ? <Notice text={cancelText(stay, 'desk') ?? 'Cancelled.'} /> : null}
      {stay.refund ? <Notice tone="success" text={`${money(stay.refund.amount)} ${stay.refund.status === 'done' ? 'refunded' : 'being refunded'} to the tenant.`} /> : null}
      {stay.moveOut && stay.status !== 'moved_out' ? (
        <Notice tone="info" text={`Moving out ${dayShort(stay.moveOut.on)}${stay.moveOut.kind === 'notice' && stay.moveOut.by === 'tenant' ? ': the tenant gave notice' : ''}.`} />
      ) : null}

      {objection ? (
        <Card>
          <Text style={styles.strong}>{objection.status === 'open' ? 'The tenant says something’s wrong' : 'The tenant said something was wrong'}</Text>
          <Text style={styles.text}>{objection.reason}</Text>
          <Text style={styles.muted}>
            {objection.status === 'open'
              ? `Sent ${momentText(objection.at)}. Ruxstar support is looking into it and may call you; your share is on hold until then.`
              : objection.status === 'withdrawn'
                ? 'They withdrew it.'
                : objection.status === 'released'
                  ? 'Ruxstar sorted it and paid you.'
                  : 'Ruxstar refunded the tenant.'}
          </Text>
          {objection.note ? <Text style={styles.muted}>{`Ruxstar: ${objection.note}`}</Text> : null}
        </Card>
      ) : null}

      {!cancelled && stay.status !== 'awaiting_payment' ? (
        <>
          <Section title="The stay" />
          <StayTimeline steps={stayTimeline(stay, now, true)} />
        </>
      ) : null}

      <View style={styles.summary}>
        <Text style={styles.label}>{`Paid ${money(stay.price.total)}${stay.price.platformFee ? `, including a ${money(stay.price.platformFee)} platform fee` : ''}`}</Text>
        {stay.price.discount ? <Text style={styles.label}>{discountLine(stay.price.discount, stay.coupon, 'Property')}</Text> : null}
        <Text style={styles.value}>{`Your share ${money(stay.vendorShare)}`}</Text>
        <Text style={styles.label}>{`${PAYOUT_LABEL[stay.payout]}${stay.payout === 'waiting' && stay.releaseAt ? `, around ${momentText(stay.releaseAt)}` : ''}.`}</Text>
      </View>
      {stay.deposit.amount ? <Text style={styles.muted}>{`Collect the ${money(stay.deposit.amount)} deposit yourself at move-in; it isn’t paid through Ruxstar.`}</Text> : null}
      {stay.reason ? <Notice text={`Tenant’s note: ${stay.reason}`} /> : null}

      {failure ? <ErrorBanner message={failure} onRetry={reload} /> : null}
      {stay.canCancel && deskCan(property, 'stays.cancel') ? <TextLink muted label="Cancel, refund in full" onPress={() => open('cancel')} /> : null}

      <ConfirmSheet
        visible={sheet === 'movein'}
        title={`${stay.tenant.name} moved in?`}
        message="They can then tell Ruxstar within the check window if something’s wrong. If they don’t, your share is paid out."
        confirmLabel="Yes, moved in"
        loading={busy}
        onConfirm={() => void run(() => StaysDeskService.movedIn(token, stay.id, { idempotencyKey: newIdempotencyKey() }))}
        onCancel={() => setSheet(null)}
      />
      <MoveOutSheet
        stay={stay}
        visible={sheet === 'moveout'}
        busy={busy}
        failure={sheetFailure}
        onCancel={() => setSheet(null)}
        onConfirm={(on, reason) => void run(() => StaysDeskService.moveOut(token, stay.id, { on, ...(reason ? { reason } : {}) }, { idempotencyKey: newIdempotencyKey() }))}
      />
      <ReasonSheet
        visible={sheet === 'cancel'}
        title="Cancel and refund?"
        message={`${stay.tenant.name} gets back all ${money(stay.price.total)}, platform fee included, and sees your reason. The beds open up again.`}
        prompt="Why are you cancelling?"
        placeholder="Like “The room needs repairs”"
        confirmLabel="Cancel and refund"
        loading={busy}
        failure={sheetFailure}
        onConfirm={(reason) => void run(() => StaysDeskService.cancel(token, stay.id, reason, { idempotencyKey: newIdempotencyKey() }))}
        onCancel={() => setSheet(null)}
      />
    </ScreenContainer>
  );
}

/** One reservation for the property's desk: the tenant, the timeline, moving in and out, the money, any objection, and cancelling with a full refund. */
export function DeskStayScreen() {
  const token = useAuthToken();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [now, setNow] = useState(Date.now);
  const stay = useAsyncResource(() => StaysDeskService.reservation(token, id), id);
  const properties = useAsyncResource(() => StaysDeskService.properties(token), 'stays-desk');
  const reloadStay = stay.reload;
  const reload = useCallback(() => {
    setNow(Date.now());
    reloadStay();
  }, [reloadStay]);
  useRefetchOnFocus(reload);
  const property = properties.data?.find((p) => p.id === stay.data?.property.id) ?? null;
  return stay.data ? (
    <StayView stay={stay.data} property={property} now={now} setStay={stay.setData} reload={reload} />
  ) : (
    <ScreenContainer title="Reservation">
      <AsyncBoundary loading={stay.loading} error={stay.error} hasData={false} onRetry={stay.reload} skeletonRows={4}>
        {null}
      </AsyncBoundary>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', gap: Spacing.three, alignItems: 'flex-start' },
  headText: { flex: 1, gap: 2 },
  title: { ...Typography.heading, color: Brand.text },
  muted: { ...Typography.caption, fontSize: 14, color: Brand.textMuted },
  verified: { ...Typography.caption, fontSize: 14, color: Brand.success },
  text: { ...Typography.body, fontSize: 15, color: Brand.text },
  strong: { ...Typography.bodyStrong, fontSize: 15, color: Brand.text },
  label: { ...Typography.caption, color: Brand.textMuted },
  value: { ...Typography.bodyStrong, fontSize: 15, color: Brand.text },
  summary: { gap: 4, padding: Spacing.three, borderRadius: Radius.lg, borderWidth: 1, borderColor: Brand.border },
});

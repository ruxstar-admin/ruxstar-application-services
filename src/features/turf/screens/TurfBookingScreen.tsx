import { useCallback, useEffect, useRef, useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { RefundLine } from '@/components/booking';
import { AsyncBoundary } from '@/components/ui/AsyncBoundary';
import { Badge } from '@/components/ui/Badge';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { ConfirmSheet } from '@/components/ui/ConfirmSheet';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { TextLink } from '@/components/ui/TextLink';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { Notice, Section } from '@/features/coaching/components/Parts';
import { timeText } from '@/features/events/lib/events';
import { errorText } from '@/features/events/lib/messages';
import { OrderInvoices } from '@/features/invoices/components/OrderInvoices';
import { RateOrderCard } from '@/features/reviews/components/RateOrderCard';
import { money } from '@/features/vendor/lib/pod';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { useAuthToken } from '@/hooks/use-auth-token';
import { useRefetchOnFocus } from '@/hooks/use-refetch-on-focus';
import { newIdempotencyKey } from '@/lib/api-client';
import { Feedback } from '@/lib/haptics';
import { TurfReviewService, TurfService } from '@/services/turf-service';
import type { TurfBooking } from '@/types/turf';
import { OccurrenceRows } from '../components/OccurrenceRows';
import { openTurfCheckout, turfReturn } from '../lib/checkout';
import { BOOKING_STATUS, mapsUrl, refundFor, slotLengthText } from '../lib/turf';

function CancelDatesSheet({ booking, visible, busy, onCancel, onConfirm }: { booking: TurfBooking; visible: boolean; busy: boolean; onCancel: () => void; onConfirm: (picked: number[]) => void }) {
  const open = booking.occurrences.filter((o) => o.status === 'booked' && o.canCancel).map((o) => o.n);
  const [picked, setPicked] = useState<number[]>(open);
  const [shown, setShown] = useState(visible);
  if (visible !== shown) {
    setShown(visible);
    if (visible) setPicked(open);
  }
  const back = refundFor(booking.occurrences, picked);
  return (
    <BottomSheet visible={visible} onClose={onCancel} title="Which dates?">
      <Text style={styles.muted}>Tick the dates to cancel. Each gets back what the refund rule gives at this moment.</Text>
      <OccurrenceRows
        occurrences={booking.occurrences}
        viewer="customer"
        picked={picked}
        onPick={setPicked}
        refundText={(o) => (o.refundIfCancelled?.amount ? `${money(o.refundIfCancelled.amount)} back` : 'No refund now')}
      />
      <PrimaryButton
        label={picked.length ? `Cancel ${picked.length === 1 ? '1 date' : `${picked.length} dates`}${back ? ` · ${money(back)} back` : ''}` : 'Tick a date to cancel'}
        onPress={() => onConfirm(picked)}
        loading={busy}
        disabled={!picked.length}
      />
      <PrimaryButton label="Keep them" variant="outline" onPress={onCancel} disabled={busy} />
    </BottomSheet>
  );
}

function BookingView({ booking, reload, openPay, fresh }: { booking: TurfBooking; reload: () => void; openPay: boolean; fresh: boolean }) {
  const router = useRouter();
  const token = useAuthToken();
  const [paying, setPaying] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const opened = useRef(false);
  const status = BOOKING_STATUS[booking.status];
  const unpaid = booking.status === 'awaiting_payment';
  const confirmed = booking.status === 'confirmed';
  const cancellable = booking.occurrences.filter((o) => o.status === 'booked' && o.canCancel);
  const weekly = booking.occurrences.length > 1;

  const pay = useCallback(async () => {
    setPaying(true);
    setFailure(null);
    try {
      const { checkoutUrl } = await TurfService.pay(token, booking.id, turfReturn());
      await openTurfCheckout(checkoutUrl);
    } catch (err) {
      setFailure(errorText(err));
    } finally {
      setPaying(false);
      reload();
    }
  }, [token, booking.id, reload]);

  useEffect(() => {
    if (openPay && unpaid && !opened.current) {
      opened.current = true;
      void pay();
    }
  }, [openPay, unpaid, pay]);

  const cancel = async (picked?: number[]) => {
    setBusy(true);
    setFailure(null);
    try {
      const whole = !picked || picked.length === cancellable.length;
      await TurfService.cancel(token, booking.id, whole ? undefined : picked, { idempotencyKey: newIdempotencyKey() });
      Feedback.success();
      reload();
    } catch (err) {
      Feedback.error();
      setFailure(errorText(err));
    } finally {
      setBusy(false);
      setCancelling(false);
    }
  };

  const back = refundFor(booking.occurrences, cancellable.map((o) => o.n));
  const footer = unpaid ? <PrimaryButton label={`Pay ${money(booking.price.total)}`} loading={paying} onPress={pay} /> : null;
  const where = `${booking.ground.address}, ${booking.ground.city}`;

  return (
    <ScreenContainer title="Ground booking" footer={footer}>
      {fresh && confirmed ? (
        <View style={styles.yay}>
          <Ionicons name="checkmark-circle" size={22} color={Brand.success} />
          <Text style={styles.yayText}>You’re booked. See you on the ground!</Text>
        </View>
      ) : null}

      <View style={styles.head}>
        <View style={styles.headText}>
          <Text style={styles.title} accessibilityRole="link" onPress={() => router.push({ pathname: '/(customer)/turf/[id]', params: { id: booking.ground.id } })}>
            {booking.ground.name}
          </Text>
          <Text style={styles.muted}>{[booking.court.name, booking.sport?.name, `${slotLengthText(booking.slotMinutes)} slots`].filter(Boolean).join(' · ')}</Text>
          {weekly ? <Text style={styles.muted}>{`Every week for ${booking.weeks} weeks`}</Text> : null}
        </View>
        <Badge label={status.label} tone={status.tone} />
      </View>

      {unpaid && booking.payBy ? <Notice tone="warning" text={`Pay by ${timeText(booking.payBy)} or the slots go back.`} /> : null}
      {booking.ground.removed ? <Notice tone="error" text="Ruxstar took this ground down. Dates that hadn’t been played are cancelled and refunded in full." /> : null}
      {booking.status === 'cancelled' && booking.reason ? <Notice text={booking.reason} /> : null}
      {booking.refunds.map((r) => (
        <Notice
          key={`${r.at}|${r.amount}`}
          tone="success"
          text={r.status === 'done' ? `${money(r.amount)} refunded to how you paid. Banks take up to 7 days to show it.` : `Refunding ${money(r.amount)}…`}
        />
      ))}

      <Section title={weekly ? 'Dates' : 'When'} />
      <OccurrenceRows occurrences={booking.occurrences} viewer="customer" />
      <TextLink label="Get directions" onPress={() => Linking.openURL(mapsUrl({ address: booking.ground.address, city: booking.ground.city, point: booking.ground.point }))} />
      <Text style={styles.muted}>{where}</Text>

      {booking.addOns.length ? (
        <>
          <Section title="Add-ons" />
          <Text style={styles.text}>{booking.addOns.map((a) => `${a.quantity} × ${a.name}`).join(', ')}</Text>
        </>
      ) : null}

      <View style={styles.summary}>
        <Text style={styles.label}>{`Booking #${booking.orderNo}`}</Text>
        <Text style={styles.value}>
          {`${money(booking.price.total)}${unpaid ? ' to pay' : ''}${booking.price.platformFee ? `, including a ${money(booking.price.platformFee)} platform fee` : ''}`}
        </Text>
        {booking.price.discount ? <Text style={styles.label}>{`${money(booking.price.discount)} off${booking.coupon ? ` with ${booking.coupon.code}` : ''}`}</Text> : null}
        <Text style={styles.label}>{`By ${booking.business.name}`}</Text>
      </View>
      <OrderInvoices refs={booking.invoices} />

      {booking.status !== 'cancelled' ? <RefundLine text={booking.refundRule} refundable /> : null}
      {booking.canCancel ? (
        <TextLink muted label={unpaid ? 'Cancel' : weekly ? 'Cancel some or all dates' : back ? `Cancel and get ${money(back)} back` : 'Cancel'} onPress={() => setCancelling(true)} />
      ) : null}
      {booking.canReview ? (
        <RateOrderCard
          order={{
            id: booking.id,
            name: booking.ground.name,
            reviewUntil: booking.reviewUntil ?? null,
            api: TurfReviewService,
            noun: 'booking',
            placeholder: 'The pitch, the lights, the staff, how easy it was to find',
          }}
        />
      ) : null}
      {failure ? <ErrorBanner message={failure} onRetry={reload} /> : null}

      {weekly && !unpaid ? (
        <CancelDatesSheet booking={booking} visible={cancelling} busy={busy} onCancel={() => setCancelling(false)} onConfirm={(picked) => void cancel(picked)} />
      ) : (
        <ConfirmSheet
          visible={cancelling}
          title="Cancel this booking?"
          message={unpaid ? 'The slots go to someone else.' : back ? `The slots are given up and ${money(back)} goes back to how you paid.` : 'The slots are given up. It’s too late for a refund by the ground’s rule.'}
          confirmLabel="Cancel booking"
          loading={busy}
          onConfirm={() => void cancel()}
          onCancel={() => setCancelling(false)}
        />
      )}
    </ScreenContainer>
  );
}

/** One ground booking: its dates, directions, paying, cancelling all or some dates by the refund rule, invoices and a review. */
export function TurfBookingScreen() {
  const token = useAuthToken();
  const { id, pay, fresh } = useLocalSearchParams<{ id: string; pay?: string; fresh?: string }>();
  const { data, loading, error, reload } = useAsyncResource(() => TurfService.booking(token, id), id);
  useRefetchOnFocus(useCallback(() => reload(), [reload]));
  return data ? (
    <BookingView booking={data} reload={reload} openPay={pay === '1'} fresh={fresh === '1' || pay === '1'} />
  ) : (
    <ScreenContainer title="Ground booking">
      <AsyncBoundary loading={loading} error={error} hasData={false} onRetry={reload} skeletonRows={4}>
        {null}
      </AsyncBoundary>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  yay: { flexDirection: 'row', gap: Spacing.two, alignItems: 'center', padding: Spacing.three, borderRadius: Radius.md, backgroundColor: 'rgba(52,199,89,0.12)' },
  yayText: { ...Typography.bodyStrong, fontSize: 15, color: Brand.text, flex: 1 },
  head: { flexDirection: 'row', gap: Spacing.three, alignItems: 'flex-start' },
  headText: { flex: 1, gap: 2 },
  title: { ...Typography.heading, color: Brand.text },
  muted: { ...Typography.caption, fontSize: 14, color: Brand.textMuted },
  text: { ...Typography.body, fontSize: 15, color: Brand.text },
  label: { ...Typography.caption, color: Brand.textMuted },
  summary: { gap: 4, padding: Spacing.three, borderRadius: Radius.lg, borderWidth: 1, borderColor: Brand.border },
  value: { ...Typography.body, fontSize: 15, color: Brand.text },
});

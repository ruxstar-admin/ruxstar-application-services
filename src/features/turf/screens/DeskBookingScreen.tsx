import { useCallback, useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { AsyncBoundary } from '@/components/ui/AsyncBoundary';
import { Badge } from '@/components/ui/Badge';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ReasonSheet } from '@/components/ui/ReasonSheet';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { TextLink } from '@/components/ui/TextLink';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { Notice, Section } from '@/features/coaching/components/Parts';
import { errorText } from '@/features/events/lib/messages';
import { money } from '@/features/vendor/lib/pod';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { useAuthToken } from '@/hooks/use-auth-token';
import { useRefetchOnFocus } from '@/hooks/use-refetch-on-focus';
import { newIdempotencyKey } from '@/lib/api-client';
import { Feedback } from '@/lib/haptics';
import { TurfDeskService } from '@/services/turf-service';
import type { DeskBooking, DeskGround, Occurrence } from '@/types/turf';
import { OccurrenceRows } from '../components/OccurrenceRows';
import { arrivalChoices, BOOKING_STATUS, deskCan, slotLengthText, slotWhen } from '../lib/turf';

function ArrivalRow({ o, now, busy, onMark }: { o: Occurrence; now: number; busy: string | null; onMark: (status: 'arrived' | 'no_show') => void }) {
  const choices = arrivalChoices(o, now);
  if (!choices.arrived && !choices.noShow) return null;
  return (
    <View style={styles.arrival}>
      <Text style={styles.text}>{slotWhen(o.startAt, o.endAt)}</Text>
      <View style={styles.pair}>
        <View style={styles.half}>
          <PrimaryButton
            label="Arrived"
            variant={o.arrival === 'arrived' ? 'primary' : 'outline'}
            disabled={!choices.arrived || o.arrival === 'arrived'}
            loading={busy === `${o.n}:arrived`}
            onPress={() => onMark('arrived')}
          />
        </View>
        <View style={styles.half}>
          <PrimaryButton
            label="No-show"
            variant={o.arrival === 'no_show' ? 'primary' : 'outline'}
            disabled={!choices.noShow || o.arrival === 'no_show'}
            loading={busy === `${o.n}:no_show`}
            onPress={() => onMark('no_show')}
          />
        </View>
      </View>
    </View>
  );
}

function BookingView({ booking, ground, now, reload }: { booking: DeskBooking; ground: DeskGround | null; now: number; reload: () => void }) {
  const token = useAuthToken();
  const [busy, setBusy] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [choosing, setChoosing] = useState(false);
  const [asking, setAsking] = useState(false);
  const [picked, setPicked] = useState<number[]>([]);
  const status = BOOKING_STATUS[booking.status];
  const weekly = booking.occurrences.length > 1;
  const open = booking.occurrences.filter((o) => o.status === 'booked' && Date.parse(o.endAt) > now);
  const canCancel = booking.status === 'confirmed' && booking.canCancel && open.length > 0 && deskCan(ground, 'turf.cancel');
  const canMark = booking.status === 'confirmed' && deskCan(ground, 'turf.arrivals');

  const mark = async (o: Occurrence, mark: 'arrived' | 'no_show') => {
    setBusy(`${o.n}:${mark}`);
    setFailure(null);
    try {
      await TurfDeskService.arrival(token, booking.id, o.n, mark, { idempotencyKey: newIdempotencyKey() });
      Feedback.success();
      reload();
    } catch (err) {
      Feedback.error();
      setFailure(errorText(err));
    } finally {
      setBusy(null);
    }
  };

  const startCancel = () => {
    setPicked(open.map((o) => o.n));
    setFailure(null);
    if (weekly && open.length > 1) setChoosing(true);
    else setAsking(true);
  };

  const cancel = async (reason: string) => {
    setBusy('cancel');
    setFailure(null);
    try {
      const whole = picked.length === open.length;
      await TurfDeskService.cancel(token, booking.id, { ...(whole ? {} : { occurrences: picked }), reason }, { idempotencyKey: newIdempotencyKey() });
      Feedback.success();
      setAsking(false);
      reload();
    } catch (err) {
      Feedback.error();
      setFailure(errorText(err));
    } finally {
      setBusy(null);
    }
  };

  const refund = open.filter((o) => picked.includes(o.n)).reduce((sum, o) => sum + o.paid, 0);

  return (
    <ScreenContainer title={`Booking #${booking.orderNo}`}>
      <View style={styles.head}>
        <View style={styles.headText}>
          <Text style={styles.title}>{booking.customer.name}</Text>
          <Text style={styles.muted}>{[booking.court.name, booking.sport?.name, `${slotLengthText(booking.slotMinutes)} slots`].filter(Boolean).join(' · ')}</Text>
          {weekly ? <Text style={styles.muted}>{`Every week for ${booking.weeks} weeks`}</Text> : null}
        </View>
        <Badge label={status.label} tone={status.tone} />
      </View>
      {booking.customer.phone ? <TextLink label={`Call ${booking.customer.phone}`} onPress={() => Linking.openURL(`tel:${booking.customer.phone}`)} /> : null}
      {booking.status === 'cancelled' && booking.reason ? <Notice text={booking.reason} /> : null}
      {booking.refunds.map((r) => (
        <Notice key={`${r.at}|${r.amount}`} tone="success" text={`${money(r.amount)} ${r.status === 'done' ? 'refunded' : 'being refunded'}: ${r.reason}`} />
      ))}

      <Section title={weekly ? 'Dates' : 'When'} />
      <OccurrenceRows occurrences={booking.occurrences} viewer="desk" />

      {canMark ? (
        <>
          {booking.occurrences.map((o) => (
            <ArrivalRow key={o.n} o={o} now={now} busy={busy} onMark={(m) => void mark(o, m)} />
          ))}
        </>
      ) : null}

      {booking.addOns.length ? (
        <>
          <Section title="Add-ons" />
          <Text style={styles.text}>{booking.addOns.map((a) => `${a.quantity} × ${a.name}`).join(', ')}</Text>
        </>
      ) : null}

      <View style={styles.summary}>
        <Text style={styles.label}>{`Paid ${money(booking.price.total)}${booking.price.platformFee ? `, including a ${money(booking.price.platformFee)} platform fee` : ''}`}</Text>
        {booking.price.discount ? <Text style={styles.label}>{`${money(booking.price.discount)} off${booking.coupon ? ` with ${booking.coupon.code}` : ''}`}</Text> : null}
        <Text style={styles.value}>{`Your share ${money(booking.vendorShare)}`}</Text>
      </View>

      {failure && !asking ? <ErrorBanner message={failure} onRetry={reload} /> : null}
      {canCancel ? <TextLink muted label={weekly && open.length > 1 ? 'Cancel some or all dates, refund in full' : 'Cancel, refund in full'} onPress={startCancel} /> : null}

      <BottomSheet visible={choosing} onClose={() => setChoosing(false)} title="Which dates?">
        <Text style={styles.muted}>Tick the dates to cancel. The customer gets back everything they paid for them.</Text>
        <OccurrenceRows occurrences={booking.occurrences} viewer="desk" picked={picked} onPick={setPicked} pickable={(o) => open.some((x) => x.n === o.n)} refundText={(o) => `${money(o.paid)} back`} />
        <PrimaryButton
          label={picked.length ? `Cancel ${picked.length === 1 ? '1 date' : `${picked.length} dates`}` : 'Tick a date to cancel'}
          disabled={!picked.length}
          onPress={() => {
            setChoosing(false);
            setAsking(true);
          }}
        />
        <PrimaryButton label="Keep them" variant="outline" onPress={() => setChoosing(false)} />
      </BottomSheet>
      <ReasonSheet
        visible={asking}
        title="Cancel and refund?"
        message={`${booking.customer.name} gets ${money(refund)} back${picked.length === open.length && booking.price.platformFee ? ', plus the platform fee,' : ''} and sees your reason. The slots open up again.`}
        prompt="Why are you cancelling?"
        placeholder="Like “Rain has flooded the pitch”"
        confirmLabel="Cancel and refund"
        loading={busy === 'cancel'}
        failure={failure}
        onConfirm={(reason) => void cancel(reason)}
        onCancel={() => setAsking(false)}
      />
    </ScreenContainer>
  );
}

/** One booking at a ground, for its desk: the customer, dates, arrivals, money, and cancelling with a full refund. */
export function DeskBookingScreen() {
  const token = useAuthToken();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [now, setNow] = useState(Date.now);
  const booking = useAsyncResource(() => TurfDeskService.booking(token, id), id);
  const grounds = useAsyncResource(() => TurfDeskService.grounds(token), 'desk');
  const reloadBooking = booking.reload;
  const reload = useCallback(() => {
    setNow(Date.now());
    reloadBooking();
  }, [reloadBooking]);
  useRefetchOnFocus(reload);
  const ground = grounds.data?.find((g) => g.id === booking.data?.ground.id) ?? null;
  return booking.data ? (
    <BookingView booking={booking.data} ground={ground} now={now} reload={reload} />
  ) : (
    <ScreenContainer title="Booking">
      <AsyncBoundary loading={booking.loading} error={booking.error} hasData={false} onRetry={booking.reload} skeletonRows={4}>
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
  text: { ...Typography.body, fontSize: 15, color: Brand.text },
  label: { ...Typography.caption, color: Brand.textMuted },
  value: { ...Typography.bodyStrong, fontSize: 15, color: Brand.text },
  summary: { gap: 4, padding: Spacing.three, borderRadius: Radius.lg, borderWidth: 1, borderColor: Brand.border },
  arrival: { gap: Spacing.two, padding: Spacing.three, borderRadius: Radius.lg, backgroundColor: Brand.surface, borderWidth: 1, borderColor: Brand.border },
  pair: { flexDirection: 'row', gap: Spacing.two },
  half: { flex: 1 },
});

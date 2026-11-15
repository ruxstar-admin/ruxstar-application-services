import { useCallback, useEffect, useRef, useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { RefundLine } from '@/components/booking';
import { AsyncBoundary } from '@/components/ui/AsyncBoundary';
import { Badge } from '@/components/ui/Badge';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { ConfirmSheet } from '@/components/ui/ConfirmSheet';
import { DayPicker } from '@/components/ui/DayTimePicker';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ReasonSheet } from '@/components/ui/ReasonSheet';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { TextLink } from '@/components/ui/TextLink';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { Card, Notice, Section } from '@/features/coaching/components/Parts';
import { discountLine } from '@/features/coupons/lib/coupons';
import { timeText } from '@/features/events/lib/events';
import { errorText } from '@/features/events/lib/messages';
import { OrderInvoices } from '@/features/invoices/components/OrderInvoices';
import { RateOrderCard } from '@/features/reviews/components/RateOrderCard';
import { money } from '@/features/vendor/lib/pod';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { useAuthToken } from '@/hooks/use-auth-token';
import { useRefetchOnFocus } from '@/hooks/use-refetch-on-focus';
import { newIdempotencyKey } from '@/lib/api-client';
import { istDayKey } from '@/lib/booking/days';
import { nightsBetween } from '@/lib/dates';
import { Feedback } from '@/lib/haptics';
import { reviewsOf } from '@/services/review-service';
import { StaysService } from '@/services/stays-service';
import type { StayReservation } from '@/types/stays';
import { StayTimeline } from '../components/StayTimeline';
import { openStaysCheckout, staysReturn } from '../lib/checkout';
import { STAY_STATUS, bedsText, cancelText, dayShort, depositLine, mapsUrl, momentText, noticeText, stayText, stayTimeline } from '../lib/stays';

/** Days after the earliest move-out a notice can pick. */
const NOTICE_SPAN_DAYS = 60;

function NoticeSheet({ stay, visible, busy, failure, onCancel, onConfirm }: { stay: StayReservation; visible: boolean; busy: boolean; failure: string | null; onCancel: () => void; onConfirm: (on: string) => void }) {
  const [today] = useState(() => istDayKey(Date.now()));
  const from = stay.noticeFrom ?? today;
  const [on, setOn] = useState(from);
  const [shown, setShown] = useState(visible);
  if (visible !== shown) {
    setShown(visible);
    if (visible) setOn(from);
  }
  return (
    <BottomSheet visible={visible} onClose={onCancel} title="Give notice">
      <Text style={styles.muted}>{`${noticeText(stay.noticeDays)}. Pick the day you’ll move out; the bed is free for someone else from then.`}</Text>
      <DayPicker value={on} onChange={setOn} from={from} days={nightsBetween(today, from) + NOTICE_SPAN_DAYS} />
      <Text style={styles.text}>{`Moving out ${dayShort(on)}`}</Text>
      {failure ? <ErrorBanner message={failure} /> : null}
      <PrimaryButton label="Give notice" loading={busy} onPress={() => onConfirm(on)} />
      <PrimaryButton label="Not now" variant="outline" onPress={onCancel} disabled={busy} />
    </BottomSheet>
  );
}

type Sheet = 'cancel' | 'object' | 'withdraw' | 'notice' | null;

function StayView({ stay, reload, setStay, openPay, fresh }: { stay: StayReservation; reload: () => void; setStay: (s: StayReservation) => void; openPay: boolean; fresh: boolean }) {
  const router = useRouter();
  const token = useAuthToken();
  const [now] = useState(Date.now);
  const [paying, setPaying] = useState(false);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [sheetFailure, setSheetFailure] = useState<string | null>(null);
  const opened = useRef(false);
  const status = STAY_STATUS[stay.status];
  const unpaid = stay.status === 'awaiting_payment';
  const cancelled = stay.status === 'cancelled';

  const pay = useCallback(async () => {
    setPaying(true);
    setFailure(null);
    try {
      const { checkoutUrl } = await StaysService.pay(token, stay.id, staysReturn());
      await openStaysCheckout(checkoutUrl);
    } catch (err) {
      setFailure(errorText(err));
    } finally {
      setPaying(false);
      reload();
    }
  }, [token, stay.id, reload]);

  useEffect(() => {
    if (openPay && unpaid && !opened.current) {
      opened.current = true;
      void pay();
    }
  }, [openPay, unpaid, pay]);

  const run = async (action: () => Promise<StayReservation>) => {
    setBusy(true);
    setSheetFailure(null);
    try {
      setStay(await action());
      Feedback.success();
      setSheet(null);
    } catch (err) {
      Feedback.error();
      if (sheet === 'cancel' || sheet === 'withdraw') {
        setSheet(null);
        setFailure(errorText(err));
      } else setSheetFailure(errorText(err));
    } finally {
      setBusy(false);
    }
  };
  const open = (next: Sheet) => {
    setSheetFailure(null);
    setSheet(next);
  };

  const footer = unpaid ? <PrimaryButton label={`Pay ${money(stay.price.total)}`} loading={paying} onPress={pay} /> : null;
  const objection = stay.objection;
  const back = stay.refundIfCancelled ?? 0;

  return (
    <ScreenContainer title="Your stay" footer={footer}>
      {fresh && stay.status === 'confirmed' ? (
        <View style={styles.yay}>
          <Ionicons name="checkmark-circle" size={22} color={Brand.success} />
          <Text style={styles.yayText}>{`Reserved! Move in on ${dayShort(stay.moveIn)}.`}</Text>
        </View>
      ) : null}

      <View style={styles.head}>
        <View style={styles.headText}>
          <Text style={styles.title} accessibilityRole="link" onPress={() => router.push({ pathname: '/(customer)/stays/[id]', params: { id: stay.property.id } })}>
            {stay.property.name}
          </Text>
          <Text style={styles.muted}>{bedsText(stay)}</Text>
          <Text style={styles.muted}>{stayText(stay)}</Text>
        </View>
        <Badge label={status.label} tone={status.tone} />
      </View>

      {unpaid && stay.payBy ? <Notice tone="warning" text={`Pay by ${timeText(stay.payBy)} or the bed goes back.`} /> : null}
      {stay.property.removed ? <Notice tone="error" text="Ruxstar took this place down. Reservations not moved in yet are refunded in full." /> : null}
      {cancelled ? <Notice text={cancelText(stay, 'tenant') ?? 'Cancelled.'} /> : null}
      {stay.refund && !cancelled ? (
        <Notice
          tone="success"
          text={stay.refund.status === 'done' ? `${money(stay.refund.amount)} refunded to how you paid. Banks take up to 7 days to show it.` : `Refunding ${money(stay.refund.amount)}…`}
        />
      ) : null}
      {stay.moveOut && stay.status !== 'moved_out' ? <Notice tone="info" text={`Moving out ${dayShort(stay.moveOut.on)}${stay.moveOut.kind === 'notice' ? ', with notice given' : ''}.`} /> : null}

      {!cancelled && !unpaid ? (
        <>
          <Section title="Your stay" />
          <StayTimeline steps={stayTimeline(stay, now)} />
        </>
      ) : null}

      {stay.canObject ? (
        <Card>
          <Text style={styles.strong}>Something’s wrong?</Text>
          <Text style={styles.muted}>
            {`If the room isn’t what was promised, tell Ruxstar${stay.objectionUntil ? ` by ${momentText(stay.objectionUntil)}` : ''}. The owner isn’t paid while we look into it.`}
          </Text>
          <PrimaryButton label="Tell Ruxstar" variant="outline" onPress={() => open('object')} />
        </Card>
      ) : null}
      {objection?.status === 'open' ? (
        <Card>
          <Text style={styles.strong}>You told Ruxstar something’s wrong</Text>
          <Text style={styles.text}>{objection.reason}</Text>
          <Text style={styles.muted}>{`Sent ${momentText(objection.at)}. Ruxstar support will get back to you.`}</Text>
          <TextLink muted label="It’s sorted, withdraw it" onPress={() => open('withdraw')} />
        </Card>
      ) : null}
      {objection && objection.status !== 'open' && objection.note ? <Notice text={`Ruxstar: ${objection.note}`} /> : null}

      {stay.canGiveNotice ? (
        <Card>
          <Text style={styles.strong}>Moving out?</Text>
          <Text style={styles.muted}>{`${noticeText(stay.noticeDays)}. The earliest you can leave if you give notice today is ${dayShort(stay.noticeFrom ?? stay.moveIn)}.`}</Text>
          <PrimaryButton label="Give notice" variant="outline" onPress={() => open('notice')} />
        </Card>
      ) : null}

      <Section title="Where" />
      <Text style={styles.text}>{`${stay.property.address}, ${stay.property.city}`}</Text>
      <TextLink label="Get directions" onPress={() => Linking.openURL(mapsUrl({ address: stay.property.address, city: stay.property.city, point: stay.property.point }))} />
      <Notice text={depositLine(stay.deposit)} />

      <View style={styles.summary}>
        <Text style={styles.label}>{`Reservation #${stay.orderNo}`}</Text>
        <Text style={styles.value}>
          {`${money(stay.price.total)}${unpaid ? ' to pay' : ''}${stay.price.platformFee ? `, including a ${money(stay.price.platformFee)} platform fee` : ''}`}
        </Text>
        {stay.price.discount ? <Text style={styles.label}>{discountLine(stay.price.discount, stay.coupon, 'Property')}</Text> : null}
        <Text style={styles.label}>{`By ${stay.business.name}`}</Text>
      </View>
      <OrderInvoices refs={stay.invoices} />

      {!cancelled && !stay.movedInAt ? <RefundLine text={stay.refundRule} refundable /> : null}
      {stay.canCancel ? <TextLink muted label={unpaid ? 'Cancel' : back ? `Cancel and get ${money(back)} back` : 'Cancel'} onPress={() => open('cancel')} /> : null}
      {stay.canReview ? (
        <RateOrderCard
          order={{
            id: stay.id,
            name: stay.property.name,
            reviewUntil: stay.reviewUntil ?? null,
            api: reviewsOf('stays'),
            noun: 'stay',
            ask: 'Rate your stay',
            placeholder: 'The room, the food, cleanliness, the owner or warden',
          }}
        />
      ) : null}
      {failure ? <ErrorBanner message={failure} onRetry={reload} /> : null}

      <ConfirmSheet
        visible={sheet === 'cancel'}
        title="Cancel this reservation?"
        message={unpaid ? 'The bed goes to someone else.' : back ? `The bed is given up and ${money(back)} goes back to how you paid.` : 'The bed is given up. It’s too late for a refund by the property’s rule.'}
        confirmLabel="Cancel reservation"
        loading={busy}
        onConfirm={() => void run(() => StaysService.cancel(token, stay.id, undefined, { idempotencyKey: newIdempotencyKey() }))}
        onCancel={() => setSheet(null)}
      />
      <ReasonSheet
        visible={sheet === 'object'}
        title="What’s wrong?"
        message="Ruxstar support reads this and may call you. The owner isn’t paid until it’s sorted."
        prompt="Tell us what’s wrong"
        placeholder="Like “The room has no bed” or “It’s not the room in the photos”"
        confirmLabel="Send to Ruxstar"
        loading={busy}
        failure={sheetFailure}
        onConfirm={(reason) => void run(() => StaysService.object(token, stay.id, reason, { idempotencyKey: newIdempotencyKey() }))}
        onCancel={() => setSheet(null)}
      />
      <ConfirmSheet
        visible={sheet === 'withdraw'}
        title="Withdraw it?"
        message="Ruxstar stops looking into it and the owner is paid."
        confirmLabel="Withdraw"
        loading={busy}
        onConfirm={() => void run(() => StaysService.withdrawObjection(token, stay.id, { idempotencyKey: newIdempotencyKey() }))}
        onCancel={() => setSheet(null)}
      />
      <NoticeSheet
        stay={stay}
        visible={sheet === 'notice'}
        busy={busy}
        failure={sheetFailure}
        onCancel={() => setSheet(null)}
        onConfirm={(on) => void run(() => StaysService.giveNotice(token, stay.id, on, { idempotencyKey: newIdempotencyKey() }))}
      />
    </ScreenContainer>
  );
}

/** One reservation: the timeline from reserved to all set, paying, telling Ruxstar something's wrong, notice, cancelling, invoices and a review. */
export function StayScreen() {
  const token = useAuthToken();
  const { id, pay, fresh } = useLocalSearchParams<{ id: string; pay?: string; fresh?: string }>();
  const { data, loading, error, reload, setData } = useAsyncResource(() => StaysService.stay(token, id), id);
  useRefetchOnFocus(useCallback(() => reload(), [reload]));
  return data ? (
    <StayView stay={data} reload={reload} setStay={setData} openPay={pay === '1'} fresh={fresh === '1' || pay === '1'} />
  ) : (
    <ScreenContainer title="Your stay">
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
  strong: { ...Typography.bodyStrong, fontSize: 15, color: Brand.text },
  label: { ...Typography.caption, color: Brand.textMuted },
  summary: { gap: 4, padding: Spacing.three, borderRadius: Radius.lg, borderWidth: 1, borderColor: Brand.border },
  value: { ...Typography.body, fontSize: 15, color: Brand.text },
});

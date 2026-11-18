import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AsyncBoundary } from '@/components/ui/AsyncBoundary';
import { Badge } from '@/components/ui/Badge';
import { ConfirmSheet } from '@/components/ui/ConfirmSheet';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { StatusTimeline } from '@/components/ui/StatusTimeline';
import { TextLink } from '@/components/ui/TextLink';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { Card, Divider, Notice, PriceLine, Section } from '@/features/coaching/components/Parts';
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
import { formatDateTime } from '@/lib/dates';
import { Feedback } from '@/lib/haptics';
import { GigsService } from '@/services/gigs-service';
import { reviewsOf } from '@/services/review-service';
import type { GigOrder } from '@/types/gigs';
import { NoteSheet } from '../components/NoteSheet';
import { BriefCard, DeliveryCard, useFileOpener } from '../components/OrderParts';
import { useFreelancerChat } from '../hooks/use-freelancer-chat';
import { gigsReturn, openGigsCheckout } from '../lib/checkout';
import { deadlineText, orderStatus, orderTimeline, packageLine } from '../lib/gigs';

const POLL_MS = 8000;
const finished = (o: GigOrder) => o.status === 'completed' || o.status === 'cancelled';

const CANCELLED_BY = { customer: 'you', vendor: 'the freelancer', staff: 'Ruxstar', system: 'Ruxstar' } as const;

type Sheet = 'approve' | 'revision' | 'problem' | 'cancel' | null;

function OrderView({ order, reload, setOrder, openPay, fresh }: { order: GigOrder; reload: () => void; setOrder: (o: GigOrder) => void; openPay: boolean; fresh: boolean }) {
  const router = useRouter();
  const token = useAuthToken();
  const [now] = useState(Date.now);
  const [paying, setPaying] = useState(false);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [sheetFailure, setSheetFailure] = useState<string | null>(null);
  const opened = useRef(false);
  const message = useFreelancerChat(order.freelancer);
  const files = useFileOpener(
    useCallback(async () => {
      const next = await GigsService.order(token, order.id);
      setOrder(next);
      return next;
    }, [token, order.id, setOrder]),
  );
  const status = orderStatus(order);
  const unpaid = order.status === 'awaiting_payment';
  const cancelled = order.status === 'cancelled';
  const deadline = deadlineText(order, now);
  const latest = order.deliveries[order.deliveries.length - 1];

  const pay = useCallback(async () => {
    setPaying(true);
    setFailure(null);
    try {
      const { checkoutUrl } = await GigsService.pay(token, order.id, gigsReturn());
      await openGigsCheckout(checkoutUrl);
    } catch (err) {
      setFailure(errorText(err));
    } finally {
      setPaying(false);
      reload();
    }
  }, [token, order.id, reload]);

  useEffect(() => {
    if (openPay && unpaid && !opened.current) {
      opened.current = true;
      void pay();
    }
  }, [openPay, unpaid, pay]);

  const run = async (action: () => Promise<GigOrder>) => {
    setBusy(true);
    setSheetFailure(null);
    try {
      setOrder(await action());
      Feedback.success();
      setSheet(null);
    } catch (err) {
      Feedback.error();
      setSheetFailure(errorText(err));
    } finally {
      setBusy(false);
    }
  };
  const open = (next: Sheet) => {
    setSheetFailure(null);
    setSheet(next);
  };

  const full = order.refunds.find((r) => r.kind === 'full');
  const part = order.refunds.find((r) => r.kind === 'part');
  const footer = unpaid ? (
    <PrimaryButton label={`Pay ${money(order.price.total)}`} loading={paying} onPress={pay} />
  ) : order.can.approve ? (
    <PrimaryButton label="Approve and complete" onPress={() => open('approve')} />
  ) : null;

  return (
    <ScreenContainer title="Your order" footer={footer}>
      {fresh && !unpaid && !cancelled ? (
        <View style={styles.yay}>
          <Ionicons name="checkmark-circle" size={22} color={Brand.success} />
          <Text style={styles.yayText}>{order.quoteId ? `Paid! ${order.freelancer.name} can start now.` : `Order placed! ${order.freelancer.name} has it now.`}</Text>
        </View>
      ) : null}

      <View style={styles.head}>
        <View style={styles.headText}>
          <Text style={styles.title} accessibilityRole={order.gigId ? 'link' : undefined} onPress={order.gigId ? () => router.push({ pathname: '/(customer)/gigs/[id]', params: { id: order.gigId! } }) : undefined}>
            {order.title}
          </Text>
          <Text style={styles.muted}>{`Order #${order.orderNo} · ${order.freelancer.name}`}</Text>
          <Text style={styles.muted}>{packageLine(order)}</Text>
        </View>
        <Badge label={status.label} tone={status.tone} />
      </View>
      {deadline ? <Text style={[styles.muted, order.late && styles.late]}>{deadline}</Text> : null}

      {unpaid && order.payBy ? <Notice tone="warning" text={`Pay by ${timeText(order.payBy)} or the order is cancelled.`} /> : null}
      {order.status === 'paid' && order.acceptBy ? <Notice text={`${order.freelancer.name} accepts it by ${formatDateTime(order.acceptBy)}, or you get everything back.`} /> : null}
      {order.status === 'delivered' && order.autoCompleteAt ? (
        <Notice text={`Check the delivery. If you don’t answer by ${formatDateTime(order.autoCompleteAt)}, it completes and the freelancer is paid.`} />
      ) : null}
      {order.late ? <Notice tone="warning" text="It’s past the due date. You can cancel for a full refund, or keep waiting." /> : null}
      {cancelled ? <Notice text={order.cancellation ? `Cancelled by ${CANCELLED_BY[order.cancellation.by]}: ${order.cancellation.reason}` : 'Cancelled.'} /> : null}
      {full ? <Notice tone="success" text={full.status === 'done' ? `${money(full.amount)} refunded to how you paid. Banks take up to 7 days to show it.` : `Refunding ${money(full.amount)}…`} /> : null}
      {part ? <Notice tone="success" text={`${money(part.amount)} ${part.status === 'done' ? 'refunded' : 'being refunded'} to how you paid.`} /> : null}
      {order.dispute ? (
        <Notice
          tone="warning"
          text={
            order.dispute.decision
              ? `Ruxstar decided: ${order.dispute.decision.note}`
              : 'You reported a problem. Ruxstar is looking at it and will reply on your help ticket.'
          }
        />
      ) : null}

      {!cancelled && !unpaid ? (
        <>
          <Section title="Progress" />
          <StatusTimeline steps={orderTimeline(order)} />
        </>
      ) : null}

      {order.deliveries.length ? <Section title="Deliveries" /> : null}
      {order.deliveries.map((d, i) => (
        <DeliveryCard key={d.id} delivery={d} number={i + 1} opening={files.opening} onOpen={files.open} />
      ))}
      {order.filesDeleted ? <Text style={styles.small}>The files on this order were deleted after it ended. Messages and links stay.</Text> : null}
      {files.problem ? <ErrorBanner message={files.problem} /> : null}

      {order.can.revise || order.can.report ? (
        <View style={styles.actions}>
          {order.can.revise ? (
            <PrimaryButton label={`Ask for changes (${order.revisions.left} left)`} variant="outline" onPress={() => open('revision')} />
          ) : latest && !latest.answer && order.revisions.left === 0 ? (
            <Text style={styles.small}>No revisions left on this order.</Text>
          ) : null}
          {order.can.report ? <TextLink muted label="Report a problem" onPress={() => open('problem')} /> : null}
        </View>
      ) : null}

      <Section title="Your brief" />
      <BriefCard order={order} opening={files.opening} onOpen={files.open} />
      {!order.answers.length && !order.note && !order.files.length ? <Text style={styles.small}>You didn’t add a brief. Message the freelancer anything they need.</Text> : null}
      {message ? <TextLink label={`Message ${order.freelancer.name}`} onPress={message} /> : null}

      <Card>
        <PriceLine label={order.quoteId ? 'Offer' : order.package.name} amount={order.price.items} />
        {order.price.discount ? <PriceLine label={discountLine(order.price.discount, order.coupon, 'Freelancer')} amount={order.price.discount} minus /> : null}
        {order.price.platformFee ? <PriceLine label="Platform fee" amount={order.price.platformFee} /> : null}
        <Divider />
        <PriceLine label={unpaid ? 'To pay' : 'Paid'} amount={order.price.total} strong />
      </Card>
      <OrderInvoices refs={order.invoices} />

      {order.can.cancel ? <TextLink muted label={unpaid ? 'Cancel order' : `Cancel and get ${money(order.price.total)} back`} onPress={() => open('cancel')} /> : null}

      {order.canReview ? (
        <RateOrderCard
          order={{
            id: order.id,
            name: order.freelancer.name,
            reviewUntil: order.reviewUntil ?? null,
            api: reviewsOf('gigs'),
            ask: 'Rate this order',
            placeholder: 'The work, keeping to time, how they were to deal with',
          }}
        />
      ) : null}
      {failure ? <ErrorBanner message={failure} onRetry={reload} /> : null}

      <NoteSheet
        visible={sheet === 'approve'}
        title="Approve this delivery?"
        message={`The order completes and ${order.freelancer.name} is paid. You can’t ask for changes after this.`}
        prompt="A word for the freelancer (optional)"
        placeholder="Thanks, it’s great"
        min={0}
        max={500}
        confirmLabel="Approve and complete"
        loading={busy}
        failure={sheetFailure}
        onConfirm={(note) => void run(() => GigsService.approve(token, order.id, note || undefined, { idempotencyKey: newIdempotencyKey() }))}
        onCancel={() => setSheet(null)}
      />
      <NoteSheet
        visible={sheet === 'revision'}
        title="Ask for changes"
        message={`Say what to change. ${order.revisions.left === 1 ? 'This is your last revision.' : `You have ${order.revisions.left} revisions left.`}`}
        prompt="What to change"
        placeholder="The colours, the wording, a part that’s missing"
        min={5}
        max={1000}
        confirmLabel="Send"
        loading={busy}
        failure={sheetFailure}
        onConfirm={(note) => void run(() => GigsService.revision(token, order.id, note, { idempotencyKey: newIdempotencyKey() }))}
        onCancel={() => setSheet(null)}
      />
      <NoteSheet
        visible={sheet === 'problem'}
        title="Report a problem"
        message="Ruxstar looks at the order and decides on a refund. The freelancer isn’t paid until then."
        prompt="What’s wrong"
        placeholder="What you asked for and what you got"
        min={10}
        max={2000}
        confirmLabel="Report"
        loading={busy}
        failure={sheetFailure}
        onConfirm={(reason) => void run(() => GigsService.problem(token, order.id, reason, { idempotencyKey: newIdempotencyKey() }))}
        onCancel={() => setSheet(null)}
      />
      <ConfirmSheet
        visible={sheet === 'cancel'}
        title="Cancel this order?"
        message={sheetFailure ?? (unpaid ? 'Nothing has been paid, so nothing is charged.' : `${money(order.price.total)} goes back to how you paid.`)}
        confirmLabel="Cancel order"
        loading={busy}
        onConfirm={() => void run(() => GigsService.cancel(token, order.id, undefined, { idempotencyKey: newIdempotencyKey() }))}
        onCancel={() => setSheet(null)}
      />
    </ScreenContainer>
  );
}

/** One freelance order: paying, the progress, each delivery with its files, approving, changes, problems, cancelling and a review. */
export function GigOrderScreen() {
  const token = useAuthToken();
  const { id, pay, fresh } = useLocalSearchParams<{ id: string; pay?: string; fresh?: string }>();
  const { data, loading, error, reload, setData } = useAsyncResource(() => GigsService.order(token, id), id);
  useRefetchOnFocus(useCallback(() => reload(), [reload]));
  const done = data ? finished(data) : true;
  useEffect(() => {
    if (done) return;
    const timer = setInterval(reload, POLL_MS);
    return () => clearInterval(timer);
  }, [done, reload]);

  return data ? (
    <OrderView order={data} reload={reload} setOrder={setData} openPay={pay === '1'} fresh={fresh === '1' || pay === '1'} />
  ) : (
    <ScreenContainer title="Your order">
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
  late: { color: Brand.error },
  small: { ...Typography.caption, color: Brand.textMuted },
  actions: { gap: Spacing.two },
});

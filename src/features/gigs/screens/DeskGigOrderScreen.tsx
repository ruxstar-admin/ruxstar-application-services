import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AsyncBoundary } from '@/components/ui/AsyncBoundary';
import { Badge } from '@/components/ui/Badge';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ReasonSheet } from '@/components/ui/ReasonSheet';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { StatusTimeline } from '@/components/ui/StatusTimeline';
import { TextLink } from '@/components/ui/TextLink';
import { ROLES } from '@/constants/roles';
import { Brand, Spacing, Typography } from '@/constants/theme';
import { Card, Notice, PriceLine, Section } from '@/features/coaching/components/Parts';
import { errorText } from '@/features/events/lib/messages';
import { OrderInvoices } from '@/features/invoices/components/OrderInvoices';
import { money } from '@/features/vendor/lib/pod';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { useAuthToken } from '@/hooks/use-auth-token';
import { useRefetchOnFocus } from '@/hooks/use-refetch-on-focus';
import { newIdempotencyKey } from '@/lib/api-client';
import { formatDateTime } from '@/lib/dates';
import { Feedback } from '@/lib/haptics';
import { GigDeskService } from '@/services/gigs-service';
import { useAuthStore } from '@/stores/auth-store';
import type { GigOrder, GigsRules } from '@/types/gigs';
import { DeliverForm } from '../components/DeliverForm';
import { BriefCard, DeliveryCard, useFileOpener } from '../components/OrderParts';
import { useGigsRules } from '../hooks/use-gigs';
import { deadlineText, orderStatus, orderTimeline, packageLine } from '../lib/gigs';

const POLL_MS = 8000;
const finished = (o: GigOrder) => o.status === 'completed' || o.status === 'cancelled';
const CANCELLED_BY = { customer: 'the customer', vendor: 'you', staff: 'Ruxstar', system: 'Ruxstar' } as const;

function Earnings({ order }: { order: GigOrder }) {
  if (order.share === null) return null;
  const refunded = order.refunds.reduce((s, r) => s + r.amount, 0);
  const line =
    order.status === 'completed'
      ? 'Paid to your balance. Withdraw it from Payments.'
      : order.status === 'cancelled'
        ? 'Nothing is paid for a cancelled order.'
        : order.status === 'disputed'
          ? 'Held while Ruxstar looks at the problem.'
          : 'Yours once the customer approves, or when it completes by itself.';
  return (
    <Card>
      <PriceLine label="Customer paid" amount={order.price.total} />
      {refunded ? <PriceLine label="Refunded" amount={refunded} minus /> : null}
      <PriceLine label={order.status === 'completed' ? 'You got' : 'You get'} amount={order.status === 'cancelled' ? 0 : order.share} strong />
      <Text style={styles.small}>{line}</Text>
    </Card>
  );
}

type Sheet = 'decline' | 'cancel' | null;

function OrderView({ order, rules, setOrder }: { order: GigOrder; rules: GigsRules; setOrder: (o: GigOrder) => void }) {
  const router = useRouter();
  const token = useAuthToken();
  const vendor = useAuthStore((s) => s.roles.includes(ROLES.VENDOR));
  const [now] = useState(Date.now);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [delivering, setDelivering] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [sheetFailure, setSheetFailure] = useState<string | null>(null);
  const files = useFileOpener(
    useCallback(async () => {
      const next = await GigDeskService.order(token, order.id);
      setOrder(next);
      return next;
    }, [token, order.id, setOrder]),
  );
  const status = orderStatus(order);
  const deadline = deadlineText(order, now);
  const latest = order.deliveries[order.deliveries.length - 1];
  const asked = latest?.answer?.kind === 'revision' ? latest.answer : null;

  const accept = async () => {
    setBusy(true);
    setFailure(null);
    try {
      setOrder(await GigDeskService.accept(token, order.id, { idempotencyKey: newIdempotencyKey() }));
      Feedback.success();
    } catch (err) {
      Feedback.error();
      setFailure(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  const decide = async (action: () => Promise<GigOrder>) => {
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

  const footer = order.can.accept ? (
    <PrimaryButton label="Accept and start" loading={busy && !sheet} onPress={accept} />
  ) : order.can.deliver && !delivering ? (
    <PrimaryButton label={order.deliveries.length ? 'Deliver again' : 'Deliver the work'} onPress={() => setDelivering(true)} />
  ) : null;

  return (
    <ScreenContainer title="Order" footer={footer}>
      <View style={styles.head}>
        <View style={styles.headText}>
          <Text style={styles.title}>{order.title}</Text>
          <Text style={styles.muted}>{`Order #${order.orderNo} · ${order.customer.name}`}</Text>
          <Text style={styles.muted}>{packageLine(order)}</Text>
        </View>
        <Badge label={status.label} tone={status.tone} />
      </View>
      {deadline ? <Text style={[styles.muted, order.late && styles.late]}>{deadline}</Text> : null}

      {order.status === 'paid' && order.acceptBy ? (
        <Notice tone="warning" text={`Accept by ${formatDateTime(order.acceptBy)}, or it’s cancelled and the customer gets everything back.`} />
      ) : null}
      {order.status === 'in_progress' && order.dueAt ? <Notice text={`Deliver by ${formatDateTime(order.dueAt)}. Late orders can be cancelled by the customer.`} /> : null}
      {order.status === 'delivered' && order.autoCompleteAt ? <Notice text={`Waiting for the customer. It completes by itself on ${formatDateTime(order.autoCompleteAt)}.`} /> : null}
      {asked && order.status === 'in_progress' ? <Notice tone="warning" text={`The customer asked for changes: ${asked.note ?? ''}`} /> : null}
      {order.cancellation ? <Notice text={`Cancelled by ${CANCELLED_BY[order.cancellation.by]}: ${order.cancellation.reason}`} /> : null}
      {order.dispute ? (
        <Notice
          tone="warning"
          text={order.dispute.decision ? `Ruxstar decided: ${order.dispute.decision.note}` : `The customer reported a problem: ${order.dispute.reason} Ruxstar is looking at it.`}
        />
      ) : null}
      {failure ? <ErrorBanner message={failure} /> : null}

      {delivering && order.can.deliver ? (
        <DeliverForm
          order={order}
          maxMb={rules.deliveryMaxMb}
          fileDays={rules.fileDays}
          onDelivered={(next) => {
            setOrder(next);
            setDelivering(false);
          }}
          onCancel={() => setDelivering(false)}
        />
      ) : null}

      <Section title="The brief" />
      <BriefCard order={order} opening={files.opening} onOpen={files.open} />
      {!order.answers.length && !order.note && !order.files.length ? <Text style={styles.small}>The customer didn’t add a brief. Message them to ask what they need.</Text> : null}
      <TextLink
        label={`Message ${order.customer.name}`}
        onPress={() => router.push({ pathname: '/(customer)/chat/with/[userId]', params: { userId: order.customer.id, title: order.customer.name } })}
      />

      {order.status !== 'cancelled' && order.status !== 'awaiting_payment' ? (
        <>
          <Section title="Progress" />
          <StatusTimeline steps={orderTimeline(order)} />
        </>
      ) : null}

      {order.deliveries.length ? <Section title="Your deliveries" /> : null}
      {order.deliveries.map((d, i) => (
        <DeliveryCard key={d.id} delivery={d} number={i + 1} opening={files.opening} onOpen={files.open} />
      ))}
      {files.problem ? <ErrorBanner message={files.problem} /> : null}
      <Text style={styles.small}>{`Revisions: ${order.revisions.used} of ${order.revisions.included} used.`}</Text>

      <Section title="Earnings" />
      <Earnings order={order} />
      <TextLink label="Payments and withdrawals" onPress={() => router.push(vendor ? '/(vendor)/(tabs)/payments' : '/(customer)/freelance/payments')} />
      <OrderInvoices refs={order.invoices} audience="vendor" />

      {order.can.decline ? <TextLink muted label="Decline this order" onPress={() => open('decline')} /> : null}
      {order.can.cancel && !order.can.decline ? <TextLink muted label="Cancel and refund the customer" onPress={() => open('cancel')} /> : null}

      <ReasonSheet
        visible={sheet === 'decline'}
        title="Decline this order?"
        message={`${order.customer.name} gets ${money(order.price.total)} back and sees your reason.`}
        prompt="Why you can’t take it"
        placeholder="Like “I’m fully booked this week”"
        confirmLabel="Decline"
        loading={busy}
        failure={sheetFailure}
        onConfirm={(reason) => void decide(() => GigDeskService.decline(token, order.id, reason, { idempotencyKey: newIdempotencyKey() }))}
        onCancel={() => setSheet(null)}
      />
      <ReasonSheet
        visible={sheet === 'cancel'}
        title="Cancel this order?"
        message={`${order.customer.name} gets ${money(order.price.total)} back and sees your reason. You aren’t paid for it.`}
        prompt="Why you’re cancelling"
        placeholder="Tell the customer what happened"
        confirmLabel="Cancel order"
        loading={busy}
        failure={sheetFailure}
        onConfirm={(reason) => void decide(() => GigDeskService.cancel(token, order.id, reason, { idempotencyKey: newIdempotencyKey() }))}
        onCancel={() => setSheet(null)}
      />
    </ScreenContainer>
  );
}

/** One order for the freelancer: accept or decline, the brief, delivering files and links, revisions, and what they earn. */
export function DeskGigOrderScreen() {
  const token = useAuthToken();
  const { id } = useLocalSearchParams<{ id: string }>();
  const rules = useGigsRules();
  const { data, loading, error, reload, setData } = useAsyncResource(() => GigDeskService.order(token, id), id);
  useRefetchOnFocus(useCallback(() => reload(), [reload]));
  const done = data ? finished(data) : true;
  useEffect(() => {
    if (done) return;
    const timer = setInterval(reload, POLL_MS);
    return () => clearInterval(timer);
  }, [done, reload]);

  return data && rules.data ? (
    <OrderView order={data} rules={rules.data} setOrder={setData} />
  ) : (
    <ScreenContainer title="Order">
      <AsyncBoundary
        loading={loading || rules.loading}
        error={error ?? rules.error}
        hasData={false}
        onRetry={() => {
          reload();
          rules.reload();
        }}
        skeletonRows={4}
      >
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
  late: { color: Brand.error },
  small: { ...Typography.caption, color: Brand.textMuted },
});

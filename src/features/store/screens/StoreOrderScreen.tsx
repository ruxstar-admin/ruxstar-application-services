import { useCallback, useEffect, useRef, useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
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
import { RiderCard } from '@/features/pod/components/RiderCard';
import { RateOrderCard } from '@/features/reviews/components/RateOrderCard';
import { mapsUrl } from '@/features/turf/lib/turf';
import { money } from '@/features/vendor/lib/pod';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { useAuthToken } from '@/hooks/use-auth-token';
import { useRefetchOnFocus } from '@/hooks/use-refetch-on-focus';
import { newIdempotencyKey } from '@/lib/api-client';
import { formatDateTime } from '@/lib/dates';
import { Feedback } from '@/lib/haptics';
import { StoreService } from '@/services/store-service';
import type { StoreOrder } from '@/types/store';
import { CartLines } from '../components/CartLines';
import { ReturnSheet, type ReturnAsk } from '../components/ReturnSheet';
import { openStoreCheckout, storeReturn } from '../lib/checkout';
import { orderTimeline, returnReasonLabel, returnWindowText, statusOf } from '../lib/store';

const POLL_MS = 8000;

const finished = (o: StoreOrder) => (o.status === 'delivered' || o.status === 'cancelled') && (!o.return || o.return.status === 'refunded' || o.return.status === 'rejected');

function ReturnCard({ order }: { order: StoreOrder }) {
  const r = order.return!;
  const head =
    r.status === 'requested'
      ? 'You asked for a return'
      : r.status === 'approved'
        ? 'The shop accepted your return'
        : r.status === 'rejected'
          ? 'The shop turned down your return'
          : 'Return refunded';
  const next =
    r.status === 'requested'
      ? 'The shop is looking at it. Ruxstar steps in if it takes too long.'
      : r.status === 'approved'
        ? order.method === 'pickup'
          ? 'Take the items back to the shop. You get the money once they reach it.'
          : 'Keep the items ready. You get the money once they reach the shop.'
        : r.status === 'rejected'
          ? 'Not right? Contact Ruxstar support from Help and we’ll look into it.'
          : 'Banks take up to 7 days to show it.';
  return (
    <Card>
      <Text style={styles.strong}>{head}</Text>
      <Text style={styles.muted}>{`${returnReasonLabel(r.reason)} · ${r.tripPaidBy === 'shop' ? 'the shop pays the trip back' : r.tripFee ? `${money(r.tripFee)} trip fee off` : 'no trip fee'}`}</Text>
      {r.note ? <Text style={styles.text}>{r.note}</Text> : null}
      <Text style={styles.text}>{`${money(r.amount)} ${r.status === 'refunded' ? 'refunded' : 'to come back'}`}</Text>
      {r.decision?.note ? <Notice tone={r.status === 'rejected' ? 'warning' : 'info'} text={`${r.decision.by === 'staff' ? 'Ruxstar' : 'The shop'}: ${r.decision.note}`} /> : null}
      <Text style={styles.muted}>{next}</Text>
    </Card>
  );
}

type Sheet = 'cancel' | 'return' | null;

function OrderView({ order, reload, setOrder, openPay, fresh }: { order: StoreOrder; reload: () => void; setOrder: (o: StoreOrder) => void; openPay: boolean; fresh: boolean }) {
  const router = useRouter();
  const token = useAuthToken();
  const [now] = useState(Date.now);
  const [paying, setPaying] = useState(false);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [sheetFailure, setSheetFailure] = useState<string | null>(null);
  const opened = useRef(false);
  const status = statusOf(order);
  const unpaid = order.status === 'awaiting_payment';
  const cancelled = order.status === 'cancelled';
  const pickup = order.method === 'pickup';

  const pay = useCallback(async () => {
    setPaying(true);
    setFailure(null);
    try {
      const { checkoutUrl } = await StoreService.pay(token, order.id, storeReturn());
      await openStoreCheckout(checkoutUrl);
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

  const run = async (action: () => Promise<StoreOrder>) => {
    setBusy(true);
    setSheetFailure(null);
    try {
      setOrder(await action());
      Feedback.success();
      setSheet(null);
    } catch (err) {
      Feedback.error();
      if (sheet === 'cancel') {
        setSheet(null);
        setFailure(errorText(err));
      } else setSheetFailure(errorText(err));
    } finally {
      setBusy(false);
    }
  };
  const askReturn = (ask: ReturnAsk) => void run(() => StoreService.requestReturn(token, order.id, ask, { idempotencyKey: newIdempotencyKey() }));

  const full = order.refunds.find((r) => r.kind === 'full');
  const windowLine = order.canReturn ? returnWindowText(order.returnUntil, now) : null;
  const footer = unpaid ? <PrimaryButton label={`Pay ${money(order.price.total)}`} loading={paying} onPress={pay} /> : null;
  const lines = order.lines.map((l) => ({ ...l, price: l.unitPrice, stock: l.quantity }));

  return (
    <ScreenContainer title="Your order" footer={footer}>
      {fresh && !unpaid && !cancelled ? (
        <View style={styles.yay}>
          <Ionicons name="checkmark-circle" size={22} color={Brand.success} />
          <Text style={styles.yayText}>{`Order placed! ${order.business.name} has it now.`}</Text>
        </View>
      ) : null}

      <View style={styles.head}>
        <View style={styles.headText}>
          <Text style={styles.title} accessibilityRole="link" onPress={() => router.push({ pathname: '/(customer)/store/[id]', params: { id: order.business.id } })}>
            {order.business.name}
          </Text>
          <Text style={styles.muted}>{`Order #${order.orderNo} · ${pickup ? 'Pickup' : 'Delivery'}`}</Text>
        </View>
        <Badge label={status.label} tone={status.tone} />
      </View>

      {unpaid && order.payBy ? <Notice tone="warning" text={`Pay by ${timeText(order.payBy)} or the order is cancelled.`} /> : null}
      {order.status === 'paid' && order.acceptBy ? <Notice text={`The shop accepts it by ${formatDateTime(order.acceptBy)}, or you get everything back.`} /> : null}
      {cancelled ? <Notice text={order.cancellation ? `Cancelled by ${order.cancellation.by === 'customer' ? 'you' : order.cancellation.by === 'staff' ? 'Ruxstar' : order.cancellation.by === 'system' ? 'Ruxstar' : 'the shop'}: ${order.cancellation.reason}` : 'Cancelled.'} /> : null}
      {full ? (
        <Notice tone="success" text={full.status === 'done' ? `${money(full.amount)} refunded to how you paid. Banks take up to 7 days to show it.` : `Refunding ${money(full.amount)}…`} />
      ) : null}

      {!cancelled && !unpaid ? (
        <>
          <Section title="Progress" />
          <StatusTimeline steps={orderTimeline(order)} />
        </>
      ) : null}

      {order.delivery ? <RiderCard delivery={order.delivery} code={order.delivery.dropCode} /> : null}
      {!pickup && !order.delivery && order.status === 'out_for_delivery' ? <Notice text="The shop’s own team is bringing it." /> : null}

      {order.return ? <ReturnCard order={order} /> : null}
      {order.canReturn ? (
        <Card>
          <Text style={styles.strong}>Something not right?</Text>
          <Text style={styles.muted}>{[windowLine, order.returnRule].filter(Boolean).join('. ')}</Text>
          <PrimaryButton
            label="Return items"
            variant="outline"
            onPress={() => {
              setSheetFailure(null);
              setSheet('return');
            }}
          />
        </Card>
      ) : null}

      <Section title="Items" />
      <CartLines lines={lines} />

      {pickup && order.pickupAt ? (
        <>
          <Section title="Pick up from" />
          <Text style={styles.text}>{order.pickupAt.address}</Text>
          <View style={styles.links}>
            <TextLink label="Get directions" onPress={() => Linking.openURL(mapsUrl({ address: order.pickupAt!.address, city: '', point: order.pickupAt!.point }))} />
            {order.pickupAt.phone ? <TextLink label="Call the shop" onPress={() => Linking.openURL(`tel:${order.pickupAt!.phone}`)} /> : null}
          </View>
          <Text style={styles.muted}>{`Show order #${order.orderNo} when you collect it.`}</Text>
        </>
      ) : null}
      {order.address ? (
        <>
          <Section title="Deliver to" />
          <Text style={styles.text}>{`${order.address.name} · ${order.address.phone}`}</Text>
          <Text style={styles.muted}>{`${order.address.line}, ${order.address.city} ${order.address.pincode}`}</Text>
        </>
      ) : null}
      {order.note ? <Notice text={`Your note: ${order.note}`} /> : null}

      <Card>
        <PriceLine label="Items" amount={order.price.items} />
        {!pickup ? <PriceLine label={order.price.deliveryKm !== null ? `Delivery (${order.price.deliveryKm} km)` : 'Delivery'} amount={order.price.delivery} /> : null}
        {order.price.platformFee ? <PriceLine label="Platform fee" amount={order.price.platformFee} /> : null}
        {order.price.discount ? <PriceLine label={discountLine(order.price.discount, order.coupon, 'Shop')} amount={order.price.discount} minus /> : null}
        <Divider />
        <PriceLine label={unpaid ? 'To pay' : 'Paid'} amount={order.price.total} strong />
        {order.refunded ? <PriceLine label="Refunded" amount={order.refunded} minus /> : null}
      </Card>
      {!order.return && !cancelled ? <Text style={styles.small}>{order.returnRule}</Text> : null}
      <OrderInvoices refs={order.invoices} />

      {order.canCancel ? (
        <TextLink
          muted
          label={unpaid ? 'Cancel order' : `Cancel and get ${money(order.price.total)} back`}
          onPress={() => {
            setSheetFailure(null);
            setSheet('cancel');
          }}
        />
      ) : null}

      {order.reviewable
        .filter((p) => p.canReview)
        .map((p) => (
          <RateOrderCard
            key={p.productId}
            order={{
              id: order.id,
              name: p.title,
              reviewUntil: p.reviewUntil,
              api: StoreService.productReview(p.productId),
              noun: 'product',
              ask: `Rate ${p.title}`,
              placeholder: 'Quality, fit, how it matched the photo',
            }}
          />
        ))}
      {failure ? <ErrorBanner message={failure} onRetry={reload} /> : null}

      <ConfirmSheet
        visible={sheet === 'cancel'}
        title="Cancel this order?"
        message={unpaid ? 'Nothing has been paid, so nothing is charged.' : `${money(order.price.total)} goes back to how you paid.`}
        confirmLabel="Cancel order"
        loading={busy}
        onConfirm={() => void run(() => StoreService.cancel(token, order.id, undefined, { idempotencyKey: newIdempotencyKey() }))}
        onCancel={() => setSheet(null)}
      />
      {order.canReturn ? <ReturnSheet order={order} visible={sheet === 'return'} busy={busy} failure={sheetFailure} onCancel={() => setSheet(null)} onConfirm={askReturn} /> : null}
    </ScreenContainer>
  );
}

/** One shop order: paying, the timeline, the rider, pickup, cancelling, returns, invoices and a review for each product. */
export function StoreOrderScreen() {
  const token = useAuthToken();
  const { id, pay, fresh } = useLocalSearchParams<{ id: string; pay?: string; fresh?: string }>();
  const { data, loading, error, reload, setData } = useAsyncResource(() => StoreService.order(token, id), id);
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
  text: { ...Typography.body, fontSize: 15, color: Brand.text },
  strong: { ...Typography.bodyStrong, fontSize: 15, color: Brand.text },
  small: { ...Typography.caption, color: Brand.textMuted },
  links: { flexDirection: 'row', gap: Spacing.four },
});

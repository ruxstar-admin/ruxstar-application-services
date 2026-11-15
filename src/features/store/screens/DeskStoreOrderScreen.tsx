import { useCallback, useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { AsyncBoundary } from '@/components/ui/AsyncBoundary';
import { Badge } from '@/components/ui/Badge';
import { ConfirmSheet } from '@/components/ui/ConfirmSheet';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ReasonSheet } from '@/components/ui/ReasonSheet';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { StatusTimeline } from '@/components/ui/StatusTimeline';
import { TextLink } from '@/components/ui/TextLink';
import { Brand, Spacing, Typography } from '@/constants/theme';
import { Card, Divider, Notice, PriceLine, Section } from '@/features/coaching/components/Parts';
import { discountLine } from '@/features/coupons/lib/coupons';
import { errorText } from '@/features/events/lib/messages';
import { OrderInvoices } from '@/features/invoices/components/OrderInvoices';
import { DeliverySection } from '@/features/vendor/components/DeliverySection';
import { money } from '@/features/vendor/lib/pod';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { useAuthToken } from '@/hooks/use-auth-token';
import { useRefetchOnFocus } from '@/hooks/use-refetch-on-focus';
import { newIdempotencyKey } from '@/lib/api-client';
import { formatDateTime } from '@/lib/dates';
import { Feedback } from '@/lib/haptics';
import { StoreDeskService } from '@/services/store-service';
import type { DeskStoreOrder, StorePayout } from '@/types/store';
import { CartLines } from '../components/CartLines';
import { useDeskStore } from '../hooks/use-desk-store';
import { isMove, moveLabel, orderTimeline, returnReasonLabel, statusOf } from '../lib/store';

const PAYOUT_LINE: Record<StorePayout, string> = {
  none: 'Nothing to pay out on this order.',
  waiting: 'Held until the return window and Ruxstar’s hold are over',
  return: 'Held while the return is open',
  released: 'Released to your balance',
};

type Sheet = 'cancel' | 'reject' | 'approve' | 'received' | null;

function DeskOrder({ order, setOrder, reload }: { order: DeskStoreOrder; setOrder: (o: DeskStoreOrder) => void; reload: () => void }) {
  const token = useAuthToken();
  const { can } = useDeskStore(order.business.id);
  const [busy, setBusy] = useState<string | null>(null);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [sheetFailure, setSheetFailure] = useState<string | null>(null);
  const status = statusOf(order);
  const pickup = order.method === 'pickup';
  const r = order.return;
  const moves = can('store.move') ? order.next.filter(isMove) : [];

  const run = async (what: string, action: () => Promise<DeskStoreOrder>, inSheet = false) => {
    setBusy(what);
    setFailure(null);
    setSheetFailure(null);
    try {
      setOrder(await action());
      Feedback.success();
      setSheet(null);
    } catch (err) {
      Feedback.error();
      if (inSheet) setSheetFailure(errorText(err));
      else {
        setSheet(null);
        setFailure(errorText(err));
      }
    } finally {
      setBusy(null);
    }
  };
  const open = (next: Sheet) => {
    setSheetFailure(null);
    setSheet(next);
  };
  const call = (phone: string) => {
    Feedback.tap();
    void Linking.openURL(`tel:${phone}`);
  };

  const lines = order.lines.map((l) => ({ ...l, price: l.unitPrice, stock: l.quantity, options: l.sku ? [...l.options, { name: 'SKU', value: l.sku }] : l.options }));
  const footer = moves.length ? (
    <>
      {moves.map((m, i) => (
        <PrimaryButton
          key={m}
          label={moveLabel(m, order.method)}
          variant={i === 0 ? 'primary' : 'outline'}
          loading={busy === m}
          disabled={!!busy}
          onPress={() => void run(m, () => StoreDeskService.move(token, order.id, m, { idempotencyKey: newIdempotencyKey() }))}
        />
      ))}
    </>
  ) : undefined;

  return (
    <ScreenContainer title={`Order #${order.orderNo}`} footer={footer}>
      <View style={styles.head}>
        <View style={styles.headText}>
          <Text style={styles.title}>{order.customer.name}</Text>
          <Text style={styles.muted}>{`${pickup ? 'Pickup' : 'Delivery'} · ${formatDateTime(order.paidAt ?? order.createdAt)}`}</Text>
        </View>
        <Badge label={status.label} tone={status.tone} />
      </View>
      {order.customer.phone ? <TextLink label={`Call ${order.customer.phone}`} onPress={() => call(order.customer.phone!)} /> : null}

      {order.status === 'paid' && order.acceptBy ? <Notice tone="warning" text={`Accept it by ${formatDateTime(order.acceptBy)}, or the customer gets everything back.`} /> : null}
      {order.cancellation ? <Notice text={`Cancelled by ${order.cancellation.by === 'customer' ? 'the customer' : order.cancellation.by === 'staff' || order.cancellation.by === 'system' ? 'Ruxstar' : 'the shop'}: ${order.cancellation.reason}`} /> : null}

      {r ? (
        <Card>
          <Text style={styles.strong}>{r.status === 'requested' ? 'The customer wants to return items' : r.status === 'approved' ? 'Return accepted' : r.status === 'rejected' ? 'Return turned down' : 'Return refunded'}</Text>
          <Text style={styles.muted}>{`${returnReasonLabel(r.reason)} · ${formatDateTime(r.requestedAt)}`}</Text>
          {r.note ? <Text style={styles.text}>{`“${r.note}”`}</Text> : null}
          <Text style={styles.text}>
            {r.lines
              .map((x) => {
                const l = order.lines.find((y) => y.id === x.lineId);
                return l ? `${x.quantity} × ${l.title}` : null;
              })
              .filter(Boolean)
              .join(', ')}
          </Text>
          <Text style={styles.muted}>
            {`${money(r.amount)} back to the customer · ${r.tripPaidBy === 'shop' ? 'the shop pays the trip back' : r.tripFee ? `${money(r.tripFee)} trip fee kept from the refund` : 'no trip fee'}`}
          </Text>
          {r.decision?.note ? <Text style={styles.muted}>{`${r.decision.by === 'staff' ? 'Ruxstar' : 'Note'}: ${r.decision.note}`}</Text> : null}
          {r.status === 'requested' && can('store.returns') ? (
            <View style={styles.actions}>
              <PrimaryButton label="Accept return" onPress={() => open('approve')} disabled={!!busy} />
              <PrimaryButton label="Turn it down" variant="outline" onPress={() => open('reject')} disabled={!!busy} />
            </View>
          ) : null}
          {r.status === 'approved' && !r.receivedAt && can('store.returns') ? (
            <PrimaryButton label="Items are back, refund now" onPress={() => open('received')} disabled={!!busy} />
          ) : null}
        </Card>
      ) : null}

      {!order.cancellation ? (
        <>
          <Section title="Progress" />
          <StatusTimeline steps={orderTimeline(order)} />
        </>
      ) : null}

      {!pickup ? (
        <DeliverySection
          order={order}
          desk={StoreDeskService}
          canManage={can('store.move')}
          onChanged={setOrder}
          ready={order.status === 'packed'}
        />
      ) : null}

      <Section title="Items" />
      <CartLines lines={lines} />
      {order.note ? <Notice text={`Customer’s note: ${order.note}`} /> : null}

      {order.address ? (
        <>
          <Section title="Deliver to" />
          <Text style={styles.text}>{`${order.address.name} · ${order.address.phone}`}</Text>
          <Text style={styles.muted}>{`${order.address.line}, ${order.address.city} ${order.address.pincode}`}</Text>
        </>
      ) : null}

      <Section title="Money" />
      <Card>
        <PriceLine label="Items" amount={order.price.items} />
        {!pickup ? <PriceLine label={order.price.deliveryKm !== null ? `Delivery (${order.price.deliveryKm} km)` : 'Delivery'} amount={order.price.delivery} /> : null}
        {order.price.discount ? <PriceLine label={discountLine(order.price.discount, order.coupon, 'Shop')} amount={order.price.discount} minus /> : null}
        {order.price.platformFee ? <PriceLine label="Platform fee (Ruxstar’s)" amount={order.price.platformFee} /> : null}
        <PriceLine label="Customer paid" amount={order.price.total} />
        <Divider />
        {order.commission ? <PriceLine label="Ruxstar commission" amount={order.commission} minus /> : null}
        {order.refunded ? <PriceLine label="Refunded" amount={order.refunded} minus /> : null}
        <PriceLine label="Your share" amount={order.vendorShare} strong />
      </Card>
      <Text style={styles.small}>
        {order.payout === 'waiting' && order.releaseAt ? `${PAYOUT_LINE.waiting}, ${formatDateTime(order.releaseAt)}.` : PAYOUT_LINE[order.payout]}
      </Text>
      <OrderInvoices refs={order.invoices} audience="vendor" />

      {order.canCancel && can('store.cancel') ? <TextLink muted label="Cancel and refund the customer" onPress={() => open('cancel')} /> : null}
      {failure ? <ErrorBanner message={failure} onRetry={reload} /> : null}

      <ReasonSheet
        visible={sheet === 'cancel'}
        title="Cancel this order?"
        message={`The customer gets ${money(order.price.total)} back and reads your reason.`}
        prompt="Why are you cancelling?"
        placeholder="Like “Out of stock” or “We can’t deliver there today”"
        confirmLabel="Cancel order"
        loading={busy === 'cancel'}
        failure={sheetFailure}
        onConfirm={(reason) => void run('cancel', () => StoreDeskService.cancel(token, order.id, reason, { idempotencyKey: newIdempotencyKey() }), true)}
        onCancel={() => setSheet(null)}
      />
      <ConfirmSheet
        visible={sheet === 'approve'}
        title="Accept this return?"
        message={pickup ? 'The customer brings the items back. Refund them once you have the items.' : 'Get the items back, then refund the customer here.'}
        confirmLabel="Accept return"
        loading={busy === 'approve'}
        onConfirm={() => void run('approve', () => StoreDeskService.decideReturn(token, order.id, 'approve', undefined, { idempotencyKey: newIdempotencyKey() }))}
        onCancel={() => setSheet(null)}
      />
      <ReasonSheet
        visible={sheet === 'reject'}
        title="Turn down this return?"
        message="The customer reads your reason and can ask Ruxstar to look at it."
        prompt="Why not?"
        placeholder="Like “The tag was removed and it’s been worn”"
        confirmLabel="Turn it down"
        loading={busy === 'reject'}
        failure={sheetFailure}
        onConfirm={(note) => void run('reject', () => StoreDeskService.decideReturn(token, order.id, 'reject', note, { idempotencyKey: newIdempotencyKey() }), true)}
        onCancel={() => setSheet(null)}
      />
      <ConfirmSheet
        visible={sheet === 'received'}
        title="Items are back?"
        message={r ? `${money(r.amount)} goes back to the customer now. This can’t be undone.` : ''}
        confirmLabel="Refund the customer"
        loading={busy === 'received'}
        onConfirm={() => void run('received', () => StoreDeskService.received(token, order.id, undefined, { idempotencyKey: newIdempotencyKey() }))}
        onCancel={() => setSheet(null)}
      />
    </ScreenContainer>
  );
}

/** One order at the shop desk: accept, pack, send or hand over, returns, cancelling, and the money. */
export function DeskStoreOrderScreen() {
  const token = useAuthToken();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, loading, error, reload, setData } = useAsyncResource(() => StoreDeskService.order(token, id), id);
  useRefetchOnFocus(useCallback(() => reload(), [reload]));

  return data ? (
    <DeskOrder order={data} setOrder={setData} reload={reload} />
  ) : (
    <ScreenContainer title="Order">
      <AsyncBoundary loading={loading} error={error} hasData={false} onRetry={reload} skeletonRows={4}>
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
  strong: { ...Typography.bodyStrong, fontSize: 15, color: Brand.text },
  small: { ...Typography.caption, color: Brand.textMuted },
  actions: { gap: Spacing.two },
});

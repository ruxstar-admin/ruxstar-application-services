import { useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { AsyncBoundary } from '@/components/ui/AsyncBoundary';
import { Badge } from '@/components/ui/Badge';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { StatusTimeline } from '@/components/ui/StatusTimeline';
import { TextLink } from '@/components/ui/TextLink';
import { Brand, Spacing, Typography } from '@/constants/theme';
import { OrderInvoices } from '@/features/invoices/components/OrderInvoices';
import { linesText, orderTimeline, returnReasonLabel, statusOf } from '@/features/store/lib/store';
import { optionsText } from '@/features/store/lib/variants';
import { money } from '@/features/vendor/lib/pod';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { useAuthToken } from '@/hooks/use-auth-token';
import { newIdempotencyKey } from '@/lib/api-client';
import { formatDateTime } from '@/lib/dates';
import { Feedback } from '@/lib/haptics';
import { ConsoleStoreService } from '@/services/store-service';
import type { ConsoleReturnDecision } from '@/types/store';
import { useCan } from '../access';
import { Card, Fact, Facts, Note, ReasonSheet, Section, consoleStyles, errorText } from '../components/parts';

type Sheet = 'cancel' | ConsoleReturnDecision | null;

const DECISION: Record<ConsoleReturnDecision, { title: string; message: string; confirm: string; placeholder: string }> = {
  approve: {
    title: 'Accept this return for the shop?',
    message: 'The customer sends the items back; the shop refunds once they arrive, or Ruxstar refunds from here.',
    confirm: 'Accept return',
    placeholder: 'For example: the photos show it arrived damaged.',
  },
  reject: {
    title: 'Turn down this return?',
    message: 'The shop’s money is released as usual. The customer and the shop read your note.',
    confirm: 'Turn it down',
    placeholder: 'For example: the item was used and returns need it unused.',
  },
  refund: {
    title: 'Refund the customer now?',
    message: 'The items are back, or needn’t be. The refund comes out of the shop’s share. Both sides read your note.',
    confirm: 'Refund now',
    placeholder: 'For example: the shop confirmed on call it has the items.',
  },
};

/** One local shop order for the Ruxstar team: the timeline, items, money, cancelling and settling returns. */
export function StoreOrderCaseScreen({ id }: { id: string }) {
  const router = useRouter();
  const token = useAuthToken();
  const canManage = useCan('orders.manage');
  const canAudit = useCan('audit.view');
  const { data: order, loading, error, reload, setData } = useAsyncResource(() => ConsoleStoreService.order(token, id), id);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const key = useRef(newIdempotencyKey());

  const act = async (what: Exclude<Sheet, null>, note: string) => {
    setBusy(true);
    setFailure(null);
    try {
      setData(await (what === 'cancel' ? ConsoleStoreService.cancel(token, id, note, key.current) : ConsoleStoreService.decideReturn(token, id, what, note, key.current)));
      key.current = newIdempotencyKey();
      Feedback.success();
      setSheet(null);
    } catch (err) {
      Feedback.error();
      setFailure(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  const r = order?.return;
  const openReturn = r && (r.status === 'requested' || r.status === 'approved' || r.status === 'rejected');
  const decisions: ConsoleReturnDecision[] = !r ? [] : r.status === 'requested' ? ['approve', 'reject', 'refund'] : r.status === 'approved' ? ['refund', 'reject'] : r.status === 'rejected' ? ['approve', 'refund'] : [];

  return (
    <ScreenContainer title="Shop order">
      <AsyncBoundary loading={loading} error={error} hasData={!!order} onRetry={reload} skeletonRows={5}>
        {order ? (
          <>
            <View style={styles.head}>
              <View style={styles.flex}>
                <Text style={styles.name}>{`#${order.orderNo} · ${linesText(order.lines)}`}</Text>
                <Text style={consoleStyles.muted}>{`${order.business.name} → ${order.customer.name} · ${order.method === 'pickup' ? 'Pickup' : 'Delivery'}`}</Text>
              </View>
              <Badge {...statusOf(order)} />
            </View>
            {order.cancellation ? <Note tone="danger">{`Cancelled by ${order.cancellation.by} ${formatDateTime(order.cancellation.at)}: ${order.cancellation.reason}`}</Note> : null}

            {r ? (
              <Card>
                <Text style={consoleStyles.body}>{`Return: ${returnReasonLabel(r.reason)} · ${r.status}`}</Text>
                {r.note ? <Text style={consoleStyles.muted}>{`Customer: ${r.note}`}</Text> : null}
                <Text style={consoleStyles.muted}>{`${money(r.amount)} back · trip paid by ${r.tripPaidBy}${r.tripFee ? ` (${money(r.tripFee)})` : ''} · asked ${formatDateTime(r.requestedAt)}`}</Text>
                {r.decision ? <Text style={consoleStyles.muted}>{`${r.decision.by === 'staff' ? 'Ruxstar' : 'Shop'}: ${r.decision.note ?? 'no note'} · ${formatDateTime(r.decision.at)}`}</Text> : null}
                {r.receivedAt ? <Text style={consoleStyles.muted}>{`Items back ${formatDateTime(r.receivedAt)}`}</Text> : null}
                {canManage && openReturn ? (
                  <View style={styles.actions}>
                    {decisions.map((d, i) => (
                      <PrimaryButton key={d} label={DECISION[d].confirm} variant={i === 0 ? 'primary' : 'outline'} onPress={() => setSheet(d)} disabled={busy} />
                    ))}
                  </View>
                ) : null}
              </Card>
            ) : null}

            <Section>Progress</Section>
            <StatusTimeline steps={orderTimeline(order)} />

            <Section>Items</Section>
            <Card>
              {order.lines.map((l) => (
                <View key={l.id} style={styles.line}>
                  <Text style={consoleStyles.body}>{`${l.quantity} × ${l.title}`}</Text>
                  <Text style={consoleStyles.muted}>{[optionsText(l.options), l.sku, `${money(l.unitPrice)} each`].filter(Boolean).join(' · ')}</Text>
                </View>
              ))}
            </Card>

            <Card>
              <Facts>
                <Fact label="Customer paid" value={money(order.price.total)} />
                <Fact label="Items" value={money(order.price.items)} />
                <Fact label="Delivery" value={order.method === 'pickup' ? 'Pickup' : `${money(order.price.delivery)}${order.price.deliveryKm !== null ? ` · ${order.price.deliveryKm} km` : ''}`} />
                <Fact label="Discount" value={order.price.discount ? `${money(order.price.discount)}${order.coupon ? ` · ${order.coupon.code}` : ''}` : 'None'} />
                <Fact label="Commission" value={money(order.commission)} />
                <Fact label="Shop’s share" value={money(order.vendorShare)} />
                <Fact label="Refunded" value={money(order.refunded)} warn={order.refunded > 0} />
                <Fact label="Payout" value={order.releasedAt ? `Released ${formatDateTime(order.releasedAt)}` : order.releaseAt ? `Due ${formatDateTime(order.releaseAt)}` : order.payout} />
                {order.address ? <Fact label="Deliver to" value={`${order.address.line}, ${order.address.city} ${order.address.pincode}`} /> : null}
                {order.delivery ? <Fact label="Rider" value={`${order.delivery.carrier === 'partner' ? 'Ruxstar partner' : 'Shop team'} · ${order.delivery.status}`} /> : null}
                <Fact label="Order id" value={order.id} />
              </Facts>
            </Card>
            <OrderInvoices refs={order.invoices} audience="staff" />

            {failure ? <ErrorBanner message={failure} /> : null}
            {canManage && order.canCancel ? <PrimaryButton label="Cancel and refund in full" variant="outline" onPress={() => setSheet('cancel')} disabled={busy} /> : null}
            <View style={styles.links}>
              <TextLink label="Open the shop" onPress={() => router.push({ pathname: '/(admin)/store/[id]', params: { id: order.business.id } })} />
              <TextLink label="Open the customer" onPress={() => router.push({ pathname: '/(admin)/account/[id]', params: { id: order.customerId } })} />
              {canAudit ? <TextLink label="History for this order" onPress={() => router.push({ pathname: '/(admin)/audit', params: { target: order.id } })} /> : null}
            </View>

            <ReasonSheet
              visible={sheet === 'cancel'}
              title="Cancel this order?"
              message={`The customer gets ${money(order.price.total)} back. The customer and the shop read your reason.`}
              prompt="Reason"
              placeholder="For example: the shop can’t be reached and the order is late."
              confirmLabel="Cancel and refund"
              loading={busy}
              onConfirm={(reason) => void act('cancel', reason)}
              onCancel={() => setSheet(null)}
            />
            {sheet && sheet !== 'cancel' ? (
              <ReasonSheet
                visible
                title={DECISION[sheet].title}
                message={DECISION[sheet].message}
                prompt="Note for both sides"
                placeholder={DECISION[sheet].placeholder}
                confirmLabel={DECISION[sheet].confirm}
                loading={busy}
                onConfirm={(note) => void act(sheet, note)}
                onCancel={() => setSheet(null)}
              />
            ) : null}
          </>
        ) : null}
      </AsyncBoundary>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  head: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingVertical: Spacing.two },
  name: { ...Typography.heading, color: Brand.text },
  actions: { gap: Spacing.two, marginTop: Spacing.one },
  line: { gap: 2, paddingVertical: Spacing.one },
  links: { gap: Spacing.three, alignItems: 'flex-start', marginTop: Spacing.two },
});

import { useRef, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { useLocalSearchParams } from 'expo-router';
import { AsyncBoundary } from '@/components/ui/AsyncBoundary';
import { Badge } from '@/components/ui/Badge';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { InputField } from '@/components/ui/InputField';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { StatusTimeline } from '@/components/ui/StatusTimeline';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { TextLink } from '@/components/ui/TextLink';
import { OrderPriceList } from '@/features/pod/components/OrderPriceList';
import { ProblemCard } from '@/features/pod/components/ProblemCard';
import { choiceLine, isClosed, nextSteps, progressOf, quantityLine, SHOP_STATUS_LABEL, STATUS_TONE, STEP_ACTION } from '@/features/pod/lib/order';
import { FileRow } from '@/features/pod/components/FileRow';
import { money } from '@/features/vendor/lib/pod';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { useAuthToken } from '@/hooks/use-auth-token';
import { newIdempotencyKey } from '@/lib/api-client';
import { formatDateTime } from '@/lib/dates';
import { Feedback } from '@/lib/haptics';
import { timeAgo } from '@/lib/time';
import { ShopOrderService } from '@/services/order-service';
import type { PrintFile, ShopOrder, ShopStatus } from '@/types/order';

function ShopOrderDetails({ order, onChanged }: { order: ShopOrder; onChanged: (order: ShopOrder) => void }) {
  const token = useAuthToken();
  const [moving, setMoving] = useState<ShopStatus | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const [refundOpen, setRefundOpen] = useState(false);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [refunding, setRefunding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const keys = useRef<Partial<Record<ShopStatus, string>>>({});
  const refundKey = useRef(newIdempotencyKey());

  const move = async (status: ShopStatus) => {
    setMoving(status);
    setError(null);
    keys.current[status] ??= newIdempotencyKey();
    try {
      const next = await ShopOrderService.move(token, order.id, status, status === 'rejected' ? reason.trim() : undefined, { idempotencyKey: keys.current[status] });
      Feedback.success();
      setRejecting(false);
      keys.current = {};
      onChanged(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update the order. Try again.');
      Feedback.error();
    } finally {
      setMoving(null);
    }
  };

  const openFile = async (file: PrintFile) => {
    setError(null);
    try {
      const { url } = await ShopOrderService.fileLink(token, order.id, file.id);
      await WebBrowser.openBrowserAsync(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not open the file.');
    }
  };

  const refund = async () => {
    setRefunding(true);
    setError(null);
    try {
      const next = await ShopOrderService.refund(token, order.id, refundPaise, refundReason.trim(), { idempotencyKey: refundKey.current });
      Feedback.success();
      refundKey.current = newIdempotencyKey();
      setRefundOpen(false);
      setRefundAmount('');
      setRefundReason('');
      onChanged(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not refund. Try again.');
      setRefundOpen(false);
      Feedback.error();
    } finally {
      setRefunding(false);
    }
  };

  const steps = nextSteps(order);
  const closed = isClosed(order.status);
  const { address } = order;
  const refundPaise = Math.round(Number(refundAmount || '0') * 100);
  const refundValid = refundPaise >= 100 && refundPaise <= order.refundable && refundReason.trim().length >= 5;
  const partials = order.refunds.filter((r) => r.kind === 'partial');
  const moneyNote =
    order.status === 'refunded'
      ? 'Ruxstar refunded the customer in full, so there is no payout for this order.'
      : order.releasedAt
        ? `${money(order.price.payoutLeft)} is in your available balance.`
        : order.problem?.status === 'open'
          ? 'Held while Ruxstar looks into the customer’s problem.'
          : order.releaseAt
            ? `Moves to your available balance on ${formatDateTime(order.releaseAt)}, 48 hours after delivery.`
            : 'Moves to your available balance 48 hours after you mark it delivered.';

  return (
    <>
      <View style={styles.head}>
        <View style={styles.flex}>
          <Text style={styles.title}>{`Order #${order.orderNo}`}</Text>
          <Text style={styles.muted}>{`${order.shop.name} · paid ${order.paidAt ? timeAgo(order.paidAt) : ''}`}</Text>
        </View>
        <Badge label={SHOP_STATUS_LABEL[order.status]} tone={STATUS_TONE[order.status]} />
      </View>

      {order.status === 'rejected' ? (
        <View style={styles.news}>
          <Text style={styles.strong}>You turned this order down</Text>
          {order.reason ? <Text style={styles.muted}>{order.reason}</Text> : null}
          <Text style={styles.muted}>The customer was refunded in full.</Text>
        </View>
      ) : order.status === 'cancelled' ? (
        <View style={styles.news}>
          <Text style={styles.strong}>{order.reason ? 'Cancelled' : 'The customer cancelled'}</Text>
          {order.reason ? <Text style={styles.muted}>{order.reason}</Text> : null}
          <Text style={styles.muted}>They were refunded in full. Nothing to make.</Text>
        </View>
      ) : order.status === 'refunded' ? (
        <View style={styles.news}>
          <Text style={styles.strong}>Ruxstar refunded this order</Text>
          {order.reason ? <Text style={styles.muted}>{order.reason}</Text> : null}
        </View>
      ) : order.status === 'placed' && order.acceptBy ? (
        <View style={styles.news}>
          <Text style={styles.strong}>{`Accept by ${formatDateTime(order.acceptBy)}`}</Text>
          <Text style={styles.muted}>After that it is cancelled and the customer is refunded.</Text>
        </View>
      ) : null}
      {order.problem ? (
        <>
          <Text style={styles.section}>Customer reported a problem</Text>
          <ProblemCard problem={order.problem} forShop />
        </>
      ) : null}
      {error ? <ErrorBanner message={error} /> : null}

      {steps.length ? (
        <View style={styles.actions}>
          {steps.map((status) =>
            status === 'rejected' ? (
              <PrimaryButton key={status} label={STEP_ACTION[status]} variant="outline" onPress={() => setRejecting(true)} disabled={!!moving} />
            ) : (
              <PrimaryButton key={status} label={STEP_ACTION[status]} onPress={() => move(status)} loading={moving === status} disabled={!!moving && moving !== status} />
            ),
          )}
        </View>
      ) : null}

      {!closed ? (
        <>
          <Text style={styles.section}>Progress</Text>
          <StatusTimeline steps={progressOf(order)} />
        </>
      ) : null}

      <Text style={styles.section}>To print</Text>
      <View style={styles.card}>
        <Text style={styles.strong}>{order.productLabel}</Text>
        <Text style={styles.muted}>{[quantityLine(order), choiceLine(order)].filter(Boolean).join(' · ')}</Text>
        {order.note ? <Text style={styles.text}>{`Note: ${order.note}`}</Text> : null}
      </View>
      {order.files.map((file) => (
        <FileRow key={file.id} file={file} onOpen={closed ? undefined : () => openFile(file)} />
      ))}

      <Text style={styles.section}>Deliver to</Text>
      <View style={styles.card}>
        <Text style={styles.strong}>{address.name}</Text>
        <Text style={styles.muted}>{`${address.line}, ${address.city} ${address.pincode}`}</Text>
        <Pressable accessibilityRole="button" onPress={() => Linking.openURL(`tel:+91${address.phone}`)} style={styles.call} hitSlop={6}>
          <Ionicons name="call-outline" size={16} color={Brand.primarySoft} />
          <Text style={styles.link}>{address.phone}</Text>
        </Pressable>
      </View>

      <Text style={styles.section}>Money</Text>
      <View style={styles.card}>
        <OrderPriceList
          price={order.price}
          pricing={order.pricing}
          after={[
            ...(order.price.platformFee ? [{ label: 'Platform fee, to Ruxstar', amount: order.price.platformFee, negative: true }] : []),
            { label: `Ruxstar commission, ${order.price.commissionBps / 100}%`, amount: order.price.commission, negative: true },
            ...(order.price.coupon?.fundedBy === 'ruxstar' && order.price.discount
              ? [{ label: 'Coupon, paid by Ruxstar', amount: order.price.discount }]
              : []),
            ...partials.map((r) => ({ label: `Refunded: ${r.reason ?? 'partial refund'}`, amount: r.amount, negative: true })),
            { label: 'You get', amount: order.price.payoutLeft },
          ]}
        />
        <Text style={styles.faint}>{moneyNote}</Text>
        {order.refundable >= 100 ? <TextLink label="Refund part of this order" onPress={() => setRefundOpen(true)} /> : null}
      </View>

      <BottomSheet visible={refundOpen} onClose={() => setRefundOpen(false)} title="Refund part of this order">
        <Text style={styles.muted}>{`It comes out of your share, up to ${money(order.refundable)}. The customer sees your reason and the order carries on.`}</Text>
        <InputField
          label="Amount in rupees"
          value={refundAmount}
          onChangeText={(text) => setRefundAmount(text.replace(/[^0-9.]/g, '').replace(/(\.\d{0,2}).*$/, '$1'))}
          keyboardType="decimal-pad"
          placeholder="250"
          error={refundPaise > order.refundable ? `At most ${money(order.refundable)}.` : undefined}
        />
        <InputField label="Reason" value={refundReason} onChangeText={setRefundReason} maxLength={300} multiline placeholder="For example: 2 of the 12 shirts couldn't be printed" />
        <PrimaryButton label={refundPaise >= 100 ? `Refund ${money(refundPaise)}` : 'Refund'} onPress={refund} loading={refunding} disabled={!refundValid} />
        <PrimaryButton label="Cancel" variant="outline" onPress={() => setRefundOpen(false)} disabled={refunding} />
      </BottomSheet>

      <BottomSheet visible={rejecting} onClose={() => setRejecting(false)} title="Turn down this order?">
        <Text style={styles.muted}>{`The customer gets ${money(order.price.total)} back and sees your reason.`}</Text>
        <InputField label="Reason" value={reason} onChangeText={setReason} maxLength={300} multiline placeholder="For example: out of XXL white shirts" />
        <PrimaryButton label="Turn down and refund" onPress={() => move('rejected')} loading={moving === 'rejected'} disabled={reason.trim().length < 5} />
        <PrimaryButton label="Keep the order" variant="outline" onPress={() => setRejecting(false)} disabled={moving === 'rejected'} />
      </BottomSheet>
    </>
  );
}

/** One paid order to a vendor's shop: what to make, where it goes, what they earn, and the next step. */
export function ShopOrderScreen() {
  const token = useAuthToken();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, loading, error, reload, setData } = useAsyncResource(() => ShopOrderService.get(token, id));

  return (
    <ScreenContainer title="Order">
      <AsyncBoundary loading={loading} error={error} hasData={!!data} onRetry={reload} skeletonRows={4}>
        {data ? <ShopOrderDetails order={data} onChanged={setData} /> : null}
      </AsyncBoundary>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  head: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  title: { ...Typography.title, color: Brand.text },
  strong: { ...Typography.bodyStrong, color: Brand.text },
  text: { ...Typography.body, color: Brand.text },
  muted: { ...Typography.caption, color: Brand.textMuted },
  faint: { ...Typography.caption, fontSize: 12, color: Brand.textFaint, marginTop: Spacing.two },
  section: { ...Typography.overline, color: Brand.textMuted, marginTop: Spacing.four, marginBottom: Spacing.one },
  card: { gap: Spacing.one, padding: Spacing.three, borderRadius: Radius.lg, backgroundColor: Brand.surface, borderWidth: 1, borderColor: Brand.border },
  news: { gap: Spacing.one, padding: Spacing.three, borderRadius: Radius.lg, backgroundColor: Brand.surfaceAlt, marginTop: Spacing.two },
  actions: { gap: Spacing.two, marginTop: Spacing.three },
  call: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one, marginTop: Spacing.one },
  link: { ...Typography.bodyStrong, fontSize: 14, color: Brand.primarySoft },
});

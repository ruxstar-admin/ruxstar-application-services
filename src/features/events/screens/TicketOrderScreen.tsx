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
import { TextLink } from '@/components/ui/TextLink';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { discountLine } from '@/features/coupons/lib/coupons';
import { OrderInvoices } from '@/features/invoices/components/OrderInvoices';
import { RateOrderCard } from '@/features/reviews/components/RateOrderCard';
import { money } from '@/features/vendor/lib/pod';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { useAuthToken } from '@/hooks/use-auth-token';
import { useRefetchOnFocus } from '@/hooks/use-refetch-on-focus';
import { newIdempotencyKey } from '@/lib/api-client';
import { Feedback } from '@/lib/haptics';
import { EventsService } from '@/services/events-service';
import { reviewsOf } from '@/services/review-service';
import type { TicketOrder } from '@/types/events';
import { TicketPass } from '../components/TicketPass';
import { useFullBrightness } from '../hooks/use-full-brightness';
import { openTicketCheckout, ticketReturn } from '../lib/checkout';
import { ORDER_STATUS, dayText, linesText, timeText, whenLine } from '../lib/events';
import { errorText } from '../lib/messages';

function OrderView({ order, reload, openPay, fresh }: { order: TicketOrder; reload: () => void; openPay: boolean; fresh: boolean }) {
  const router = useRouter();
  const token = useAuthToken();
  const [paying, setPaying] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const opened = useRef(false);
  const status = ORDER_STATUS[order.status];
  const unpaid = order.status === 'awaiting_payment';

  const pay = useCallback(async () => {
    setPaying(true);
    setFailure(null);
    try {
      const { checkoutUrl } = await EventsService.pay(token, order.id, ticketReturn());
      await openTicketCheckout(checkoutUrl);
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

  const cancel = async () => {
    setBusy(true);
    try {
      await EventsService.cancel(token, order.id, { idempotencyKey: newIdempotencyKey() });
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

  const valid = order.tickets.filter((t) => t.status === 'valid');
  const showsPasses = !(order.event.online && order.status === 'confirmed');
  useFullBrightness(showsPasses && valid.some((t) => t.qr));
  const footer = unpaid ? <PrimaryButton label={`Pay ${money(order.price.total)}`} loading={paying} onPress={pay} /> : null;

  return (
    <ScreenContainer title="Your tickets" footer={footer}>
      {fresh && order.status === 'confirmed' ? (
        <View style={styles.yay}>
          <Ionicons name="checkmark-circle" size={22} color={Brand.success} />
          <Text style={styles.yayText}>You’re going! Share each ticket with the person it’s for.</Text>
        </View>
      ) : null}

      <View style={styles.head}>
        <View style={styles.headText}>
          <Text style={styles.title} onPress={() => router.push({ pathname: '/(customer)/events/[id]', params: { id: order.event.id } })}>
            {order.event.title}
          </Text>
          <Text style={styles.muted}>{whenLine(order.event.startsAt, order.event.endsAt)}</Text>
          <Text style={styles.muted}>
            {order.event.online ? 'Online' : [order.event.venueName, order.event.address].filter(Boolean).join(', ')}
          </Text>
        </View>
        <Badge label={status.label} tone={status.tone} />
      </View>

      {unpaid && order.payBy ? (
        <View style={styles.note}>
          <Ionicons name="time-outline" size={18} color={Brand.warning} />
          <Text style={styles.noteText}>{`Pay by ${timeText(order.payBy)} or the tickets go back on sale.`}</Text>
        </View>
      ) : null}
      {order.event.cancelled ? (
        <View style={styles.note}>
          <Ionicons name="close-circle-outline" size={18} color={Brand.error} />
          <Text style={styles.noteText}>The organiser cancelled this event. Everything you paid is refunded.</Text>
        </View>
      ) : null}
      {order.refund ? (
        <View style={styles.note}>
          <Ionicons name="cash-outline" size={18} color={Brand.success} />
          <Text style={styles.noteText}>
            {order.refund.status === 'done'
              ? `${money(order.refund.amount)} refunded to how you paid. Banks take up to 7 days to show it.`
              : `Refunding ${money(order.refund.amount)}…`}
          </Text>
        </View>
      ) : null}

      {order.status === 'confirmed' && order.event.online && order.event.onlineLink ? (
        <PrimaryButton label="Join online" onPress={() => Linking.openURL(order.event.onlineLink!)} />
      ) : null}

      {showsPasses ? (
        <View style={styles.passes}>
          {order.tickets.map((t, i) => (
            <TicketPass key={t.id} ticket={t} title={order.event.title} startsAt={order.event.startsAt} index={i} total={order.tickets.length} />
          ))}
        </View>
      ) : null}

      <View style={styles.summary}>
        <Text style={styles.label}>{`Booking #${order.orderNo}`}</Text>
        <Text style={styles.value}>{order.team ? `${order.team} · ${order.tickets.length} players` : linesText(order.lines)}</Text>
        <Text style={styles.value}>{order.price.total ? `${money(order.price.total)}${order.status === 'awaiting_payment' ? ' to pay' : ''}${order.price.platformFee ? `, including a ${money(order.price.platformFee)} fee` : ''}` : 'Free'}</Text>
        {order.price.discount ? <Text style={styles.label}>{discountLine(order.price.discount, order.coupon, 'Organiser')}</Text> : null}
        <Text style={styles.label}>{`By ${order.business.name}`}</Text>
      </View>
      <OrderInvoices refs={order.invoices} />

      {order.canReview ? (
        <RateOrderCard
          order={{
            id: order.id,
            name: order.event.title,
            reviewUntil: order.reviewUntil ?? null,
            api: reviewsOf('events'),
            noun: 'booking',
            ask: 'Rate this event',
            placeholder: 'The show, the venue, how it was run',
          }}
        />
      ) : null}

      {order.canCancel && valid.length ? (
        <TextLink muted label={order.price.total ? 'Cancel and get a refund' : 'Cancel my tickets'} onPress={() => setCancelling(true)} />
      ) : null}
      {failure ? <ErrorBanner message={failure} onRetry={reload} /> : null}

      <ConfirmSheet
        visible={cancelling}
        title="Cancel this booking?"
        message={
          order.price.total
            ? `All ${order.tickets.length} tickets are cancelled and ${money(order.price.total)} goes back to how you paid.${order.cancelUntil ? ` You can do this until ${dayText(order.cancelUntil)}, ${timeText(order.cancelUntil)}.` : ''}`
            : `All ${order.tickets.length} tickets are cancelled and the seats go to someone else.`
        }
        confirmLabel="Cancel booking"
        loading={busy}
        onConfirm={cancel}
        onCancel={() => setCancelling(false)}
      />
    </ScreenContainer>
  );
}

/** One booking: every person's QR ticket to show or share, paying if it isn't paid, and cancelling while refunds are open. */
export function TicketOrderScreen() {
  const token = useAuthToken();
  const { id, pay, fresh } = useLocalSearchParams<{ id: string; pay?: string; fresh?: string }>();
  const { data, loading, error, reload } = useAsyncResource(() => EventsService.order(token, id), id);
  useRefetchOnFocus(useCallback(() => reload(), [reload]));
  return data ? (
    <OrderView order={data} reload={reload} openPay={pay === '1'} fresh={fresh === '1' || pay === '1'} />
  ) : (
    <ScreenContainer title="Your tickets">
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
  note: { flexDirection: 'row', gap: Spacing.two, alignItems: 'flex-start', padding: Spacing.three, borderRadius: Radius.md, backgroundColor: Brand.surfaceAlt },
  noteText: { ...Typography.caption, fontSize: 14, color: Brand.text, flex: 1 },
  passes: { gap: Spacing.three },
  summary: { gap: 4, padding: Spacing.three, borderRadius: Radius.lg, borderWidth: 1, borderColor: Brand.border },
  label: { ...Typography.caption, color: Brand.textMuted },
  value: { ...Typography.body, fontSize: 15, color: Brand.text },
});

import { useRef, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Badge } from '@/components/ui/Badge';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { InputField } from '@/components/ui/InputField';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Skeleton } from '@/components/ui/Skeleton';
import { Brand, Spacing } from '@/constants/theme';
import { ProblemCard } from '@/features/pod/components/ProblemCard';
import { isClosed, PROBLEM_LABEL, SHOP_STATUS_LABEL } from '@/features/pod/lib/order';
import { money } from '@/features/vendor/lib/pod';
import { useAuthToken } from '@/hooks/use-auth-token';
import { usePaginated } from '@/hooks/use-paginated';
import { newIdempotencyKey } from '@/lib/api-client';
import { Feedback } from '@/lib/haptics';
import { timeAgo } from '@/lib/time';
import { AdminService, type SettleOutcome } from '@/services/admin-service';
import type { StaffOrder } from '@/types/order';
import { useCan } from '../access';
import { Card, Fact, Facts, Note, Row, consoleStyles, errorText } from './parts';

const SETTLE_TITLE: Record<SettleOutcome, string> = {
  refund_full: 'Refund in full',
  refund_partial: 'Refund part',
  dismiss: 'Close without a refund',
};

function SettleSheet({ order, outcome, onClose, onDone }: { order: StaffOrder; outcome: SettleOutcome | null; onClose: () => void; onDone: (done: StaffOrder) => void }) {
  const token = useAuthToken();
  const [note, setNote] = useState('');
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const key = useRef(newIdempotencyKey());
  const [shown, setShown] = useState(outcome);
  if (outcome !== shown) {
    setShown(outcome);
    setNote('');
    setAmount('');
    setError(null);
  }

  const paise = Math.round(Number(amount || '0') * 100);
  const left = order.price.total - order.refunded;
  const valid = note.trim().length >= 5 && (outcome !== 'refund_partial' || (paise >= 100 && paise <= order.refundable));

  const settle = async () => {
    if (!outcome) return;
    setBusy(true);
    setError(null);
    try {
      const done = await AdminService.settleOrder(token, order.id, { outcome, note: note.trim(), ...(outcome === 'refund_partial' ? { amount: paise } : {}) }, key.current);
      Feedback.success();
      key.current = newIdempotencyKey();
      onDone(done);
    } catch (err) {
      Feedback.error();
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <BottomSheet visible={!!outcome} onClose={onClose} title={outcome ? SETTLE_TITLE[outcome] : ''}>
      <Text style={consoleStyles.muted}>
        {outcome === 'refund_full'
          ? `The customer gets ${money(left)} back and the order ends. The shop is not paid for it.`
          : outcome === 'refund_partial'
            ? `It comes out of the shop's share, up to ${money(order.refundable)}. The order carries on.`
            : "No money moves. The shop's share is released once its hold is over."}
      </Text>
      {outcome === 'refund_partial' ? (
        <InputField
          label="Amount in rupees"
          value={amount}
          onChangeText={(text) => setAmount(text.replace(/[^0-9.]/g, '').replace(/(\.\d{0,2}).*$/, '$1'))}
          keyboardType="decimal-pad"
          error={paise > order.refundable ? `At most ${money(order.refundable)}.` : undefined}
        />
      ) : null}
      <InputField label="Answer, shown to the customer and the shop" value={note} onChangeText={setNote} multiline maxLength={500} showCount />
      {error ? <ErrorBanner message={error} /> : null}
      <PrimaryButton label={outcome ? SETTLE_TITLE[outcome] : ''} onPress={settle} loading={busy} disabled={!valid} />
      <PrimaryButton label="Cancel" variant="outline" onPress={onClose} disabled={busy} />
    </BottomSheet>
  );
}

function ProblemDetail({ order, onDone }: { order: StaffOrder; onDone: (done: StaffOrder, message: string) => void }) {
  const canSettle = useCan('orders.manage');
  const [outcome, setOutcome] = useState<SettleOutcome | null>(null);
  const open = order.problem?.status === 'open';
  const fullAllowed = !order.releasedAt && !isClosed(order.status) && order.status !== 'placed';

  return (
    <View style={styles.detail}>
      <Facts>
        <Fact label="Order" value={`#${order.orderNo} · ${SHOP_STATUS_LABEL[order.status]}`} />
        <Fact label="Paid" value={money(order.price.total)} />
        <Fact label="Customer" value={order.customer.username ? `${order.customer.name} (@${order.customer.username})` : order.customer.name} />
        <Fact label="Shop" value={`${order.shop.name} · ${order.vendor.name}`} />
        <Fact label="Refunded" value={money(order.refunded)} warn={order.refunded > 0} />
        <Fact label="Shop's share left" value={order.releasedAt ? `${money(order.price.payoutLeft)}, paid out` : money(order.price.payoutLeft)} />
        {order.readyBy ? <Fact label="Promised ready" value={new Date(order.readyBy).toLocaleDateString('en-IN')} /> : null}
        {order.deliveredAt ? <Fact label="Delivered" value={timeAgo(order.deliveredAt)} /> : null}
      </Facts>
      {order.problem ? <ProblemCard problem={order.problem} /> : null}
      {order.refunds.map((r) => (
        <Text key={r.at} style={consoleStyles.muted}>{`${money(r.amount)} ${r.kind === 'full' ? 'full refund' : 'refunded'}${r.reason ? `: ${r.reason}` : ''} · ${r.status === 'done' ? 'sent' : 'sending'}`}</Text>
      ))}
      {open && canSettle ? (
        <>
          {fullAllowed ? <PrimaryButton label={`Refund in full (${money(order.price.total - order.refunded)})`} onPress={() => setOutcome('refund_full')} /> : null}
          {order.refundable >= 100 ? <PrimaryButton label="Refund part" variant="outline" onPress={() => setOutcome('refund_partial')} /> : null}
          <PrimaryButton label="Close without a refund" variant="outline" onPress={() => setOutcome('dismiss')} />
        </>
      ) : null}
      {open && !canSettle ? <Note>Settling needs the “Refund and settle orders” permission.</Note> : null}
      <SettleSheet
        order={order}
        outcome={outcome}
        onClose={() => setOutcome(null)}
        onDone={(done) => {
          const was = outcome;
          setOutcome(null);
          onDone(done, was === 'dismiss' ? 'Closed. The customer and the shop were told.' : 'Refunded. The customer and the shop were told.');
        }}
      />
    </View>
  );
}

/** Print orders with a reported problem: open ones hold the shop's share until someone here settles them. */
export function OrderProblemsQueue({ status }: { status: 'open' | 'resolved' }) {
  const token = useAuthToken();
  const list = usePaginated((cursor) => AdminService.orderProblems(token, status, cursor));
  const [open, setOpen] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  if (list.loading) {
    return (
      <View style={consoleStyles.skeletons}>
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} height={68} radius={14} />
        ))}
      </View>
    );
  }
  if (list.error && list.items.length === 0) {
    return <EmptyState icon="cloud-offline-outline" title="Could not load order problems" message={errorText(list.error)} actionLabel="Try again" onAction={list.retry} />;
  }

  return (
    <FlatList
      data={list.items}
      keyExtractor={(o) => o.id}
      contentContainerStyle={consoleStyles.list}
      refreshControl={<RefreshControl refreshing={list.refreshing} onRefresh={list.refresh} tintColor={Brand.primarySoft} />}
      onEndReached={list.loadMore}
      onEndReachedThreshold={0.5}
      ListHeaderComponent={done ? <Note>{done}</Note> : null}
      ListEmptyComponent={
        <EmptyState
          icon="receipt-outline"
          title={status === 'open' ? 'No order problems' : 'Nothing settled yet'}
          message={status === 'open' ? 'Problems customers report with print orders show up here.' : undefined}
        />
      }
      ListFooterComponent={list.loadingMore ? <ActivityIndicator color={Brand.primarySoft} style={consoleStyles.footer} /> : null}
      renderItem={({ item: o }) => {
        const expanded = open === o.id;
        const resolution = o.problem?.resolution;
        return (
          <Card>
            <Row
              name={o.customer.name}
              title={`#${o.orderNo} · ${o.problem ? PROBLEM_LABEL[o.problem.kind] : 'Problem'}`}
              subtitle={`${o.shop.name} · ${money(o.price.total)} · ${timeAgo(o.problem?.reportedAt ?? o.updatedAt)}`}
              right={
                resolution ? (
                  <Badge label={resolution.outcome === 'dismissed' ? 'Closed' : 'Refunded'} tone={resolution.outcome === 'dismissed' ? 'neutral' : 'success'} />
                ) : (
                  <Badge label="Open" tone="warning" />
                )
              }
              onPress={() => setOpen(expanded ? null : o.id)}
            />
            {expanded ? (
              <ProblemDetail
                order={o}
                onDone={(settled, message) => {
                  setOpen(null);
                  setDone(message);
                  list.setItems((items) => items.filter((x) => x.id !== settled.id));
                }}
              />
            ) : null}
          </Card>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  detail: { gap: Spacing.three, paddingTop: Spacing.two },
});

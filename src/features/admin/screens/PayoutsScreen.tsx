import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { InputField } from '@/components/ui/InputField';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SegmentedTabs } from '@/components/ui/SegmentedTabs';
import { Skeleton } from '@/components/ui/Skeleton';
import { Brand, Spacing } from '@/constants/theme';
import { money } from '@/features/vendor/lib/pod';
import { useAuthToken } from '@/hooks/use-auth-token';
import { usePaginated } from '@/hooks/use-paginated';
import { newIdempotencyKey } from '@/lib/api-client';
import { formatDateTime } from '@/lib/dates';
import { Feedback } from '@/lib/haptics';
import { timeAgo } from '@/lib/time';
import { AdminService } from '@/services/admin-service';
import type { HeldOrder, PayoutStatus, StaffPayout } from '@/types/admin';
import { useCan } from '../access';
import { Card, Fact, Facts, Note, ReasonSheet, Row, consoleStyles, errorText } from '../components/parts';

type Tab = PayoutStatus | 'held';

const TABS = [
  { key: 'pending', label: 'On the way' },
  { key: 'failed', label: 'Failed' },
  { key: 'paid', label: 'Paid' },
  { key: 'held', label: 'Held' },
] as const satisfies readonly { key: Tab; label: string }[];

const STATUS = {
  pending: { label: 'On the way', tone: 'warning' },
  failed: { label: 'Failed', tone: 'error' },
  paid: { label: 'Paid', tone: 'success' },
} as const;

/** Waits this long after the last keystroke before searching. */
const SEARCH_DELAY_MS = 350;

function Loading() {
  return (
    <View style={consoleStyles.skeletons}>
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} height={68} radius={14} />
      ))}
    </View>
  );
}

function PayoutDetail({ payout, onChecked }: { payout: StaffPayout; onChecked: (after: StaffPayout) => void }) {
  const token = useAuthToken();
  const canManage = useCan('payouts.manage');
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const check = async () => {
    setChecking(true);
    setError(null);
    try {
      const after = await AdminService.checkPayout(token, payout.id);
      Feedback.success();
      onChecked(after);
    } catch (err) {
      Feedback.error();
      setError(errorText(err));
    } finally {
      setChecking(false);
    }
  };

  return (
    <View style={styles.detail}>
      <Facts>
        <Fact label="Reaches the bank" value={money(payout.amount - payout.fee)} />
        <Fact label="Fee" value={money(payout.fee)} />
        <Fact label="To" value={payout.to} />
        <Fact label="Asked for" value={formatDateTime(payout.createdAt)} />
        <Fact label="Sent to Cashfree" value={`${payout.attempts} ${payout.attempts === 1 ? 'time' : 'times'}`} warn={payout.attempts > 1} />
        {payout.checkedAt ? <Fact label="Last checked" value={timeAgo(payout.checkedAt)} /> : null}
        {payout.utr ? <Fact label="Bank reference" value={payout.utr} /> : null}
        {payout.paidAt ? <Fact label="Paid" value={formatDateTime(payout.paidAt)} /> : null}
        <Fact label="Transfer id" value={payout.transferId} />
      </Facts>
      {payout.failure ? (
        <Note tone="danger">{`${payout.failure.text} (${payout.failure.code}) The money went back to the ${payout.payee === 'partner' ? "partner's" : "vendor's"} balance.`}</Note>
      ) : null}
      {payout.status === 'pending' && canManage ? <PrimaryButton label="Check with Cashfree now" variant="outline" onPress={check} loading={checking} /> : null}
      {payout.status === 'pending' && !canManage ? <Note>Checking needs the “Release held money and check payouts” permission.</Note> : null}
      {error ? <ErrorBanner message={error} /> : null}
    </View>
  );
}

function Payouts({ status }: { status: PayoutStatus }) {
  const token = useAuthToken();
  const list = usePaginated((cursor) => AdminService.payouts(token, status, cursor));
  const [open, setOpen] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  if (list.loading) return <Loading />;
  if (list.error && list.items.length === 0) {
    return <EmptyState icon="cloud-offline-outline" title="Could not load payouts" message={errorText(list.error)} actionLabel="Try again" onAction={list.retry} />;
  }

  return (
    <FlatList
      data={list.items}
      keyExtractor={(p) => p.id}
      contentContainerStyle={consoleStyles.list}
      refreshControl={<RefreshControl refreshing={list.refreshing} onRefresh={list.refresh} tintColor={Brand.primarySoft} />}
      onEndReached={list.loadMore}
      onEndReachedThreshold={0.5}
      ListHeaderComponent={done ? <Note>{done}</Note> : null}
      ListEmptyComponent={
        <EmptyState
          icon="wallet-outline"
          title={status === 'pending' ? 'Nothing on the way' : status === 'failed' ? 'No failed payouts' : 'No payouts yet'}
          message={status === 'pending' ? 'Withdrawals vendors and delivery partners ask for show up here until the bank answers.' : undefined}
        />
      }
      ListFooterComponent={list.loadingMore ? <ActivityIndicator color={Brand.primarySoft} style={consoleStyles.footer} /> : null}
      renderItem={({ item: p }) => {
        const expanded = open === p.id;
        return (
          <Card>
            <Row
              name={p.vendor.name}
              title={`${money(p.amount)} · ${p.vendor.name}`}
              subtitle={[p.payee === 'partner' ? 'Partner' : null, p.to, timeAgo(p.paidAt ?? p.createdAt)].filter(Boolean).join(' · ')}
              right={<Badge {...STATUS[p.status]} />}
              onPress={() => setOpen(expanded ? null : p.id)}
            />
            {expanded ? (
              <PayoutDetail
                payout={p}
                onChecked={(after) => {
                  if (after.status === status) {
                    list.setItems((items) => items.map((x) => (x.id === after.id ? after : x)));
                    setDone('Cashfree has no answer yet. It is checked again every few minutes.');
                    return;
                  }
                  setOpen(null);
                  list.setItems((items) => items.filter((x) => x.id !== after.id));
                  setDone(after.status === 'paid' ? `${money(after.amount - after.fee)} reached ${p.vendor.name}.` : `It failed. ${money(after.amount)} went back to ${p.vendor.name}'s balance.`);
                }}
              />
            ) : null}
          </Card>
        );
      }}
    />
  );
}

function HeldDetail({ order, onReleased }: { order: HeldOrder; onReleased: () => void }) {
  const token = useAuthToken();
  const canManage = useCan('payouts.manage');
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const key = useRef(newIdempotencyKey());

  const release = async (reason: string) => {
    setBusy(true);
    setError(null);
    try {
      await AdminService.releaseHeld(token, order.id, reason, key.current);
      key.current = newIdempotencyKey();
      Feedback.success();
      setAsking(false);
      onReleased();
    } catch (err) {
      Feedback.error();
      setAsking(false);
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.detail}>
      <Facts>
        <Fact label="Shop's share" value={money(order.amount)} />
        <Fact label="Vendor" value={order.vendor.name} />
        {order.deliveredAt ? <Fact label="Delivered" value={formatDateTime(order.deliveredAt)} /> : null}
        <Fact label="Available on its own" value={order.problemOpen ? 'After the problem is settled' : formatDateTime(order.releaseAt)} />
        {order.partner ? <Fact label={`Partner pay · ${order.partner.rider.name}`} value={money(order.partner.amount)} /> : null}
        {order.partner ? (
          <Fact
            label="Partner can withdraw it"
            value={order.partner.held ? 'After the “never arrived” report is settled' : formatDateTime(order.partner.releaseAt)}
            warn={order.partner.held}
          />
        ) : null}
      </Facts>
      {order.problemOpen ? <Note>A customer reported a problem. Settle it in Reports first, so a refund can still come out of the share.</Note> : null}
      {!order.problemOpen && canManage ? <PrimaryButton label="Release now" variant="outline" onPress={() => setAsking(true)} /> : null}
      {!order.problemOpen && !canManage ? <Note>Releasing needs the “Release held money and check payouts” permission.</Note> : null}
      {error ? <ErrorBanner message={error} /> : null}
      <ReasonSheet
        visible={asking}
        title={`Release ${money(order.amount)}?`}
        prompt="Why now? Kept in the audit log"
        placeholder="For example: the customer confirmed they got it"
        confirmLabel="Release now"
        loading={busy}
        onConfirm={release}
        onCancel={() => setAsking(false)}
      />
    </View>
  );
}

function Held() {
  const token = useAuthToken();
  const [text, setText] = useState('');
  const [orderNo, setOrderNo] = useState<number | undefined>();
  useEffect(() => {
    const t = setTimeout(() => setOrderNo(text ? Number(text) : undefined), SEARCH_DELAY_MS);
    return () => clearTimeout(t);
  }, [text]);

  return (
    <>
      <View style={styles.controls}>
        <InputField
          value={text}
          onChangeText={(value) => setText(value.replace(/\D/g, '').slice(0, 9))}
          placeholder="Order number"
          keyboardType="number-pad"
          accessibilityLabel="Find an order by its number"
        />
      </View>
      <HeldList key={orderNo ?? 'all'} orderNo={orderNo} token={token} />
    </>
  );
}

function HeldList({ orderNo, token }: { orderNo: number | undefined; token: string }) {
  const list = usePaginated((cursor) => AdminService.heldOrders(token, orderNo, cursor));
  const [open, setOpen] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  if (list.loading) return <Loading />;
  if (list.error && list.items.length === 0) {
    return <EmptyState icon="cloud-offline-outline" title="Could not load held orders" message={errorText(list.error)} actionLabel="Try again" onAction={list.retry} />;
  }

  return (
    <FlatList
      data={list.items}
      keyExtractor={(o) => o.id}
      contentContainerStyle={consoleStyles.list}
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={list.refreshing} onRefresh={list.refresh} tintColor={Brand.primarySoft} />}
      onEndReached={list.loadMore}
      onEndReachedThreshold={0.5}
      ListHeaderComponent={done ? <Note>{done}</Note> : null}
      ListEmptyComponent={
        <EmptyState
          icon="hourglass-outline"
          title={orderNo ? `Order #${orderNo} isn't on hold` : 'Nothing on hold'}
          message={orderNo ? 'It may not be delivered yet, or its share is already available.' : 'Delivered orders wait here until their hold is over.'}
        />
      }
      ListFooterComponent={list.loadingMore ? <ActivityIndicator color={Brand.primarySoft} style={consoleStyles.footer} /> : null}
      renderItem={({ item: o }) => {
        const expanded = open === o.id;
        return (
          <Card>
            <Row
              name={o.business?.name ?? o.vendor.name}
              title={`#${o.orderNo} · ${money(o.amount)}`}
              subtitle={`${o.business?.name ?? 'Shop'} · ${o.problemOpen ? 'problem reported' : `available ${formatDateTime(o.releaseAt)}`}`}
              right={<Badge label={o.problemOpen ? 'Problem' : 'On hold'} tone={o.problemOpen ? 'warning' : 'neutral'} />}
              onPress={() => setOpen(expanded ? null : o.id)}
            />
            {expanded ? (
              <HeldDetail
                order={o}
                onReleased={() => {
                  setOpen(null);
                  setDone(`Released. ${o.vendor.name} can withdraw ${money(o.amount)} now and was told.`);
                  list.setItems((items) => items.filter((x) => x.id !== o.id));
                }}
              />
            ) : null}
          </Card>
        );
      }}
    />
  );
}

/** Vendors' and delivery partners' withdrawals by status, and order shares still on hold that the team can release early. */
export function PayoutsScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('pending');

  return (
    <SafeAreaView style={styles.container}>
      <View style={consoleStyles.pad}>
        <ScreenHeader title="Payouts" onBack={() => router.back()} />
      </View>
      <View style={styles.controls}>
        <SegmentedTabs options={TABS} value={tab} onChange={setTab} />
      </View>
      {tab === 'held' ? <Held /> : <Payouts key={tab} status={tab} />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Brand.bg },
  controls: { gap: Spacing.two, paddingHorizontal: Spacing.three, paddingBottom: Spacing.two },
  detail: { gap: Spacing.three, paddingTop: Spacing.two },
});

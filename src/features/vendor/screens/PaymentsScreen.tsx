import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { AsyncBoundary } from '@/components/ui/AsyncBoundary';
import { Badge } from '@/components/ui/Badge';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { ConfirmSheet } from '@/components/ui/ConfirmSheet';
import { DetailLine } from '@/components/ui/DetailLine';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { InputField } from '@/components/ui/InputField';
import { ListRow } from '@/components/ui/ListRow';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { SegmentedTabs } from '@/components/ui/SegmentedTabs';
import { Brand, Fonts, Radius, Spacing, Typography } from '@/constants/theme';
import { KIND_LABEL } from '@/features/invoices/lib/invoices';
import { digitsOnly, isValidAccountNumber, isValidIfsc } from '@/features/kyc/lib/validators';
import { VendorTabScreen } from '@/features/vendor/components/VendorTabScreen';
import { money } from '@/features/vendor/lib/pod';
import { LINE_LOOK, PAYOUT_STATUS, REFUNDED_BY, signedAmount } from '@/features/vendor/lib/statement';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { useAuthToken } from '@/hooks/use-auth-token';
import { usePaginated } from '@/hooks/use-paginated';
import { useRefetchOnFocus } from '@/hooks/use-refetch-on-focus';
import { keepIdempotencyKey, newIdempotencyKey } from '@/lib/api-client';
import { ApiError } from '@/lib/api-error';
import { formatDateTime } from '@/lib/dates';
import { Feedback } from '@/lib/haptics';
import { timeAgo } from '@/lib/time';
import { BusinessService } from '@/services/business-service';
import type { Payments, Payout, PayoutMethod, StatementLine } from '@/types/business';

const KINDS = [
  { key: 'bank', label: 'Bank account' },
  { key: 'upi', label: 'UPI ID' },
] as const;
const TABS = [
  { key: 'statement', label: 'Statement' },
  { key: 'payouts', label: 'Payouts' },
] as const;
const VPA = /^[a-zA-Z0-9._-]{2,256}@[a-zA-Z][a-zA-Z0-9.-]{1,64}$/;

type Field = 'accountNumber' | 'confirm' | 'ifsc' | 'vpa';

function MethodForm({ onSaved, onCancel }: { onSaved: (method: PayoutMethod) => void; onCancel?: () => void }) {
  const token = useAuthToken();
  const [kind, setKind] = useState<(typeof KINDS)[number]['key']>('bank');
  const [values, setValues] = useState<Record<Field, string>>({ accountNumber: '', confirm: '', ifsc: '', vpa: '' });
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const set = (field: Field) => (text: string) => {
    const value = field === 'ifsc' ? text.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 11) : field === 'vpa' ? text.trim() : digitsOnly(text, 18);
    setValues((v) => ({ ...v, [field]: value }));
    setErrors((x) => ({ ...x, [field]: undefined }));
  };

  const save = async () => {
    const found: Partial<Record<Field, string>> = {};
    if (kind === 'bank') {
      if (!isValidAccountNumber(values.accountNumber)) found.accountNumber = 'Account numbers have 9 to 18 digits.';
      else if (values.confirm !== values.accountNumber) found.confirm = 'The two numbers do not match.';
      if (!isValidIfsc(values.ifsc)) found.ifsc = 'An IFSC has 11 characters, like YESB0000262.';
    } else if (!VPA.test(values.vpa)) found.vpa = 'A UPI ID looks like name@okhdfc.';
    setErrors(found);
    setFailure(null);
    if (Object.keys(found).length) return Feedback.error();
    setSaving(true);
    try {
      const saved = await BusinessService.setPayoutMethod(
        token,
        kind === 'bank' ? { kind, accountNumber: values.accountNumber, ifsc: values.ifsc } : { kind, vpa: values.vpa },
      );
      Feedback.success();
      if (saved) onSaved(saved);
    } catch (err) {
      Feedback.error();
      const detail = err instanceof ApiError ? (err.detailFor('accountNumber') ?? err.detailFor('vpa')) : undefined;
      if (detail) setErrors({ [kind === 'bank' ? 'accountNumber' : 'vpa']: detail.message });
      else setFailure(err instanceof ApiError && err.kind !== 'network' ? err.message : 'Could not save. Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.form}>
      <SegmentedTabs options={KINDS} value={kind} onChange={setKind} />
      {kind === 'bank' ? (
        <>
          <InputField
            label="Account number"
            value={values.accountNumber}
            onChangeText={set('accountNumber')}
            keyboardType="number-pad"
            maxLength={18}
            secureTextEntry
            error={errors.accountNumber}
          />
          <InputField label="Account number again" value={values.confirm} onChangeText={set('confirm')} keyboardType="number-pad" maxLength={18} error={errors.confirm} />
          <InputField
            label="IFSC"
            value={values.ifsc}
            onChangeText={set('ifsc')}
            placeholder="YESB0000262"
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={11}
            error={errors.ifsc}
          />
        </>
      ) : (
        <InputField
          label="UPI ID"
          value={values.vpa}
          onChangeText={set('vpa')}
          placeholder="name@okhdfc"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          error={errors.vpa}
        />
      )}
      <Text style={styles.hint}>
        {kind === 'bank'
          ? 'We check the account with your bank. It must be in the name on your Aadhaar. Only the last 4 digits are shown again.'
          : 'We send ₹1 to check it. It must be in the name on your Aadhaar.'}
      </Text>
      {failure ? <ErrorBanner message={failure} /> : null}
      <PrimaryButton label="Check and save" loading={saving} onPress={save} />
      {onCancel ? <PrimaryButton label="Cancel" variant="outline" onPress={onCancel} disabled={saving} /> : null}
    </View>
  );
}

/** Withdraws everything available once there is enough and no withdrawal is already on the way. */
function Withdraw({ data, onDone }: { data: Payments; onDone: () => void }) {
  const token = useAuthToken();
  const [asking, setAsking] = useState(false);
  const [sending, setSending] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [key, setKey] = useState(newIdempotencyKey);
  const { available } = data.balance;
  const { minimum, fee } = data.withdrawal;
  const method = data.payoutMethod;
  const blocked = !method
    ? 'Add where you get paid to withdraw.'
    : data.payouts.some((p) => p.status === 'pending')
      ? 'A withdrawal is on the way. You can withdraw again once it arrives.'
      : available < minimum
        ? `You can withdraw once ${money(minimum)} is available.`
        : null;

  const send = async () => {
    setSending(true);
    setFailure(null);
    try {
      await BusinessService.withdraw(token, key);
      Feedback.success();
      setKey(newIdempotencyKey());
      onDone();
    } catch (err) {
      Feedback.error();
      // Unsure whether it reached Ruxstar: trying again with the same key can't withdraw twice.
      const unsure = !(err instanceof ApiError) || keepIdempotencyKey(err);
      if (unsure) setFailure('Could not reach Ruxstar. Check your connection and try again.');
      else {
        setKey(newIdempotencyKey());
        setFailure(err.message);
        onDone();
      }
    } finally {
      setSending(false);
      setAsking(false);
    }
  };

  return (
    <>
      {blocked || !method ? (
        <Text style={styles.availableHint}>{blocked}</Text>
      ) : (
        <>
          <PrimaryButton label={`Withdraw ${money(available)}`} onPress={() => setAsking(true)} />
          <Text style={styles.availableHint}>{`${money(available - fee)} reaches ${method.label} after a ${money(fee)} fee.`}</Text>
          <ConfirmSheet
            visible={asking}
            title={`Withdraw ${money(available)}?`}
            message={`${money(available - fee)} goes to ${method.label} after a ${money(fee)} fee. Banks usually take a few minutes.`}
            confirmLabel="Withdraw"
            loading={sending}
            onConfirm={send}
            onCancel={() => setAsking(false)}
          />
        </>
      )}
      {failure ? <ErrorBanner message={failure} /> : null}
    </>
  );
}

function Balance({ data, onDone, onPending }: { data: Payments; onDone: () => void; onPending: () => void }) {
  return (
    <>
      <View style={styles.available}>
        <View style={styles.availableHead}>
          <Ionicons name="wallet-outline" size={18} color={Brand.success} />
          <Text style={styles.availableLabel}>Available to withdraw</Text>
        </View>
        <Text style={styles.availableAmount}>{money(data.balance.available)}</Text>
        <Withdraw data={data} onDone={onDone} />
      </View>
      <View style={styles.stats}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Pending ${money(data.balance.pending)}. Shows what's coming up`}
          onPress={() => {
            Feedback.tap();
            onPending();
          }}
          style={({ pressed }) => [styles.stat, styles.pending, pressed && styles.pressed]}
        >
          <View style={styles.statHead}>
            <Ionicons name="hourglass-outline" size={16} color={Brand.warning} />
            <Text style={[styles.statLabel, { color: Brand.warning }]}>Pending</Text>
            <Ionicons name="chevron-forward" size={14} color={Brand.warning} style={styles.statChevron} />
          </View>
          <Text style={styles.statValue}>{money(data.balance.pending)}</Text>
          <Text style={styles.statNote}>{data.upcoming.length ? `${data.upcoming.length} coming up` : 'Nothing on hold'}</Text>
        </Pressable>
        <View style={[styles.stat, styles.paidOut]}>
          <View style={styles.statHead}>
            <Ionicons name="checkmark-done-outline" size={16} color={Brand.primarySoft} />
            <Text style={[styles.statLabel, { color: Brand.primarySoft }]}>Paid out</Text>
          </View>
          <Text style={styles.statValue}>{money(data.balance.paidOut)}</Text>
          <Text style={styles.statNote}>To your account</Text>
        </View>
      </View>
    </>
  );
}

function Upcoming({ data }: { data: Payments }) {
  if (!data.upcoming.length) {
    return <Text style={styles.muted}>Nothing on hold. Your share of an order shows here once it&apos;s delivered, until you can withdraw it.</Text>;
  }
  return (
    <View style={styles.sheetList}>
      <Text style={styles.muted}>Your share of each order becomes available 48 hours after delivery, or once Ruxstar settles a reported problem.</Text>
      {data.upcoming.map((u) => (
        <View key={u.orderId} style={styles.row}>
          <View style={[styles.rowIcon, { backgroundColor: u.held ? 'rgba(255,176,32,0.14)' : 'rgba(158,156,176,0.14)' }]}>
            <Ionicons name={u.held ? 'alert-circle-outline' : 'time-outline'} size={18} color={u.held ? Brand.warning : Brand.textMuted} />
          </View>
          <View style={styles.flex}>
            <Text style={styles.rowTitle}>{`Order #${u.orderNo}`}</Text>
            <Text style={styles.muted} numberOfLines={1}>
              {u.held ? 'Held for a reported problem' : `Available ${formatDateTime(u.availableAt)}`}
            </Text>
          </View>
          <Text style={styles.rowAmount}>{money(u.amount)}</Text>
        </View>
      ))}
    </View>
  );
}

function StatementRow({ line, onPress }: { line: StatementLine; onPress: () => void }) {
  const look = LINE_LOOK[line.kind];
  const where = line.order ? [`#${line.order.orderNo}`, line.order.business?.name] : [line.payout?.to];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${look.title}, ${signedAmount(line)}`}
      onPress={() => {
        Feedback.tap();
        onPress();
      }}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={[styles.rowIcon, { backgroundColor: look.tint }]}>
        <Ionicons name={look.icon} size={18} color={look.color} />
      </View>
      <View style={styles.flex}>
        <Text style={styles.rowTitle}>{look.title}</Text>
        <Text style={styles.muted} numberOfLines={1}>
          {[...where, timeAgo(line.at)].filter(Boolean).join(' · ')}
        </Text>
      </View>
      <Text style={[styles.rowAmount, { color: line.kind === 'paid' ? Brand.text : look.color }]}>{signedAmount(line)}</Text>
    </Pressable>
  );
}

function LineDetails({ line, onOrder, onInvoice }: { line: StatementLine; onOrder: (id: string) => void; onInvoice: (id: string) => void }) {
  const look = LINE_LOOK[line.kind];
  const { order, refund, payout, invoice } = line;
  return (
    <View style={styles.details}>
      <View style={styles.detailsHead}>
        <View style={[styles.detailsIcon, { backgroundColor: look.tint }]}>
          <Ionicons name={look.icon} size={22} color={look.color} />
        </View>
        <View style={styles.flex}>
          <Text style={[styles.detailsAmount, { color: line.kind === 'paid' ? Brand.text : look.color }]}>{signedAmount(line)}</Text>
          <Text style={styles.muted}>{look.title}</Text>
        </View>
      </View>
      <Text style={styles.hint}>{look.note}</Text>
      <View style={styles.detailsCard}>
        <DetailLine label="When" value={formatDateTime(line.at)} />
        {order ? (
          <>
            {order.business ? <DetailLine label="Business" value={order.business.name} /> : null}
            <DetailLine label={line.kind === 'refund' ? 'Refunded to' : 'Paid by'} value={order.customer} />
            <DetailLine label="Order" value={`#${order.orderNo} · ${order.label} · ${money(order.total)} paid`} />
            {order.paymentId ? <DetailLine label="Payment ID" value={order.paymentId} copyable /> : null}
            {order.paidAt && line.kind !== 'paid' ? <DetailLine label="Paid on" value={formatDateTime(order.paidAt)} /> : null}
          </>
        ) : null}
        {refund ? (
          <>
            <DetailLine label="Refund ID" value={refund.id} copyable />
            <DetailLine label="Refunded by" value={REFUNDED_BY[refund.by]} />
            {refund.reason ? <DetailLine label="Reason" value={refund.reason} /> : null}
          </>
        ) : null}
        {payout ? (
          <>
            <DetailLine label="To" value={payout.to} />
            {line.kind === 'withdrawal' ? <DetailLine label="Reached your account" value={`${money(Math.abs(line.amount) - payout.fee)} after a ${money(payout.fee)} fee`} /> : null}
            <DetailLine label="Status" value={PAYOUT_STATUS[payout.status].label} />
            {payout.utr ? <DetailLine label="Bank reference" value={payout.utr} copyable /> : null}
          </>
        ) : null}
      </View>
      {order ? <PrimaryButton label="View order" variant="outline" onPress={() => onOrder(order.id)} /> : null}
      {invoice ? (
        <PrimaryButton label={`${KIND_LABEL[invoice.kind]} ${invoice.number}`} variant="outline" onPress={() => onInvoice(invoice.id)} />
      ) : null}
    </View>
  );
}

function PayoutRow({ payout, onPress }: { payout: Payout; onPress: () => void }) {
  const status = PAYOUT_STATUS[payout.status];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Withdrawal of ${money(payout.amount)}, ${status.label}`}
      onPress={() => {
        Feedback.tap();
        onPress();
      }}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={[styles.rowIcon, { backgroundColor: LINE_LOOK.withdrawal.tint }]}>
        <Ionicons name="arrow-up" size={18} color={LINE_LOOK.withdrawal.color} />
      </View>
      <View style={styles.flex}>
        <Text style={styles.rowTitle}>{money(payout.amount)}</Text>
        <Text style={styles.muted} numberOfLines={1}>
          {[payout.to, timeAgo(payout.paidAt ?? payout.createdAt)].join(' · ')}
        </Text>
      </View>
      <Badge label={status.label} tone={status.tone} />
    </Pressable>
  );
}

function PayoutDetails({ payout }: { payout: Payout }) {
  const status = PAYOUT_STATUS[payout.status];
  return (
    <View style={styles.details}>
      <View style={styles.detailsHead}>
        <View style={[styles.detailsIcon, { backgroundColor: LINE_LOOK.withdrawal.tint }]}>
          <Ionicons name="arrow-up" size={22} color={LINE_LOOK.withdrawal.color} />
        </View>
        <View style={styles.flex}>
          <Text style={styles.detailsAmount}>{money(payout.amount)}</Text>
          <Text style={styles.muted}>Withdrawal</Text>
        </View>
        <Badge label={status.label} tone={status.tone} />
      </View>
      {payout.status === 'failed' && payout.failure ? <ErrorBanner message={`${payout.failure} The money is back in your balance.`} /> : null}
      <View style={styles.detailsCard}>
        <DetailLine label="To" value={payout.to} />
        <DetailLine label="Reached your account" value={`${money(payout.amount - payout.fee)} after a ${money(payout.fee)} fee`} />
        <DetailLine label="Asked for" value={formatDateTime(payout.createdAt)} />
        {payout.paidAt ? <DetailLine label="Paid" value={formatDateTime(payout.paidAt)} /> : null}
        {payout.utr ? <DetailLine label="Bank reference" value={payout.utr} copyable /> : null}
        <DetailLine label="Payout ID" value={payout.id} copyable />
      </View>
    </View>
  );
}

function StatementList({ list, onOpen }: { list: ReturnType<typeof usePaginated<StatementLine>>; onOpen: (line: StatementLine) => void }) {
  if (list.loading) return <ActivityIndicator color={Brand.textMuted} style={styles.spinner} />;
  if (list.error && !list.items.length) return <ErrorBanner message="Could not load your statement." onRetry={list.retry} />;
  if (!list.items.length) return <Text style={styles.muted}>Nothing yet. Your share of each paid order shows here.</Text>;
  return (
    <View style={styles.list}>
      {list.items.map((line) => (
        <StatementRow key={line.id} line={line} onPress={() => onOpen(line)} />
      ))}
      {list.hasMore ? <PrimaryButton label="Show more" variant="outline" loading={list.loadingMore} onPress={list.loadMore} /> : null}
    </View>
  );
}

/** What can be withdrawn, what's on hold and what was paid out; where the vendor is paid; the statement and payouts. */
export function PaymentsScreen() {
  const token = useAuthToken();
  const { data, loading, error, reload, setData } = useAsyncResource(() => BusinessService.payments(token));
  const statement = usePaginated((cursor) => BusinessService.statement(token, cursor));
  const { refresh: refreshStatement } = statement;
  const refresh = useCallback(() => {
    reload();
    refreshStatement();
  }, [reload, refreshStatement]);
  useRefetchOnFocus(refresh);
  const [tab, setTab] = useState<(typeof TABS)[number]['key']>('statement');
  const [changing, setChanging] = useState(false);
  const [showPending, setShowPending] = useState(false);
  const [line, setLine] = useState<StatementLine | null>(null);
  const [payout, setPayout] = useState<Payout | null>(null);

  const openOrder = (id: string) => {
    const shop = line?.module === 'shop';
    setLine(null);
    if (shop) router.push({ pathname: '/(customer)/store-desk/order/[id]', params: { id } });
    else router.push({ pathname: '/(vendor)/sale/[id]', params: { id } });
  };
  const openInvoice = (id: string) => {
    setLine(null);
    router.push({ pathname: '/(vendor)/invoices/[id]', params: { id } });
  };
  const saved = (payoutMethod: PayoutMethod) => {
    if (data) setData({ ...data, payoutMethod });
    setChanging(false);
  };

  return (
    <VendorTabScreen title="Payments" onRefresh={refresh}>
      <AsyncBoundary loading={loading} error={error} hasData={!!data} onRetry={reload} skeletonRows={4}>
        {data ? (
          <>
            <Balance data={data} onDone={refresh} onPending={() => setShowPending(true)} />

            {data.payoutMethod ? (
              <View style={styles.method}>
                <View style={styles.methodIcon}>
                  <Ionicons name={data.payoutMethod.kind === 'bank' ? 'business-outline' : 'phone-portrait-outline'} size={18} color={Brand.text} />
                </View>
                <View style={styles.flex}>
                  <Text style={styles.rowTitle} numberOfLines={1}>
                    {data.payoutMethod.label}
                  </Text>
                  <Text style={styles.muted} numberOfLines={1}>
                    {[data.payoutMethod.holderName ?? 'Where you get paid', data.payoutMethod.ifsc].filter(Boolean).join(' · ')}
                  </Text>
                </View>
                <Badge label="Checked" tone="success" />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Change where you get paid"
                  onPress={() => {
                    Feedback.tap();
                    setChanging(true);
                  }}
                  style={({ pressed }) => [styles.change, pressed && styles.pressed]}
                >
                  <Text style={styles.changeText}>Change</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.addMethod}>
                <Text style={styles.rowTitle}>Where you get paid</Text>
                <MethodForm onSaved={saved} />
              </View>
            )}

            <ListRow
              icon="document-text-outline"
              title="GST invoices"
              subtitle="Invoices and credit notes for your sales, as PDFs or a CSV for your return"
              onPress={() => router.push('/(vendor)/invoices')}
            />

            <View style={styles.tabs}>
              <SegmentedTabs options={TABS} value={tab} onChange={setTab} />
            </View>
            {tab === 'statement' ? (
              <StatementList list={statement} onOpen={setLine} />
            ) : data.payouts.length ? (
              <View style={styles.list}>
                {data.payouts.map((p) => (
                  <PayoutRow key={p.id} payout={p} onPress={() => setPayout(p)} />
                ))}
              </View>
            ) : (
              <Text style={styles.muted}>No payouts yet. Withdrawals you make show here.</Text>
            )}

            <BottomSheet visible={showPending} onClose={() => setShowPending(false)} title="Coming up">
              <Upcoming data={data} />
            </BottomSheet>
            <BottomSheet visible={changing} onClose={() => setChanging(false)} title="Where you get paid">
              {changing ? <MethodForm onSaved={saved} onCancel={() => setChanging(false)} /> : null}
            </BottomSheet>
            <BottomSheet visible={!!line} onClose={() => setLine(null)} title="Payment details">
              {line ? <LineDetails line={line} onOrder={openOrder} onInvoice={openInvoice} /> : null}
            </BottomSheet>
            <BottomSheet visible={!!payout} onClose={() => setPayout(null)} title="Withdrawal">
              {payout ? <PayoutDetails payout={payout} /> : null}
            </BottomSheet>
          </>
        ) : null}
      </AsyncBoundary>
    </VendorTabScreen>
  );
}

const card = { borderRadius: Radius.lg, borderWidth: 1, padding: Spacing.three } as const;

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  pressed: { opacity: 0.7 },
  muted: { ...Typography.caption, fontSize: 14, color: Brand.textMuted },
  hint: { ...Typography.caption, color: Brand.textFaint },
  spinner: { paddingVertical: Spacing.three },
  available: { ...card, gap: Spacing.two, backgroundColor: 'rgba(52,199,89,0.08)', borderColor: 'rgba(52,199,89,0.35)' },
  availableHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  availableLabel: { ...Typography.caption, fontFamily: Fonts.semibold, color: Brand.success, textTransform: 'uppercase', letterSpacing: 0.8 },
  availableAmount: { fontFamily: Fonts.bold, fontSize: 36, color: Brand.text, marginBottom: Spacing.one },
  availableHint: { ...Typography.caption, color: Brand.textMuted },
  stats: { flexDirection: 'row', gap: Spacing.two },
  stat: { ...card, flex: 1, gap: 2 },
  pending: { backgroundColor: 'rgba(255,176,32,0.08)', borderColor: 'rgba(255,176,32,0.35)' },
  paidOut: { backgroundColor: 'rgba(180,92,242,0.08)', borderColor: 'rgba(180,92,242,0.35)' },
  statHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one, marginBottom: Spacing.one },
  statLabel: { ...Typography.caption, fontFamily: Fonts.semibold, textTransform: 'uppercase', letterSpacing: 0.6 },
  statChevron: { marginLeft: 'auto' },
  statValue: { fontFamily: Fonts.bold, fontSize: 20, color: Brand.text },
  statNote: { ...Typography.caption, fontSize: 12, color: Brand.textMuted },
  method: { ...card, flexDirection: 'row', alignItems: 'center', gap: Spacing.three, backgroundColor: Brand.surface, borderColor: Brand.border },
  methodIcon: { width: 36, height: 36, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: Brand.surfaceAlt },
  change: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, borderRadius: Radius.pill, borderWidth: 1, borderColor: Brand.border },
  changeText: { ...Typography.caption, fontFamily: Fonts.semibold, color: Brand.text },
  addMethod: { ...card, gap: Spacing.three, backgroundColor: Brand.surface, borderColor: Brand.border },
  form: { gap: Spacing.two },
  tabs: { marginTop: Spacing.two },
  list: { gap: Spacing.two },
  sheetList: { gap: Spacing.three },
  row: { ...card, flexDirection: 'row', alignItems: 'center', gap: Spacing.three, backgroundColor: Brand.surface, borderColor: Brand.border },
  rowIcon: { width: 36, height: 36, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { ...Typography.bodyStrong, fontSize: 15, color: Brand.text },
  rowAmount: { ...Typography.bodyStrong, fontSize: 15, color: Brand.text },
  details: { gap: Spacing.three },
  detailsHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  detailsIcon: { width: 48, height: 48, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  detailsAmount: { fontFamily: Fonts.bold, fontSize: 28, color: Brand.text },
  detailsCard: { ...card, gap: Spacing.three, backgroundColor: Brand.bg, borderColor: Brand.border },
});

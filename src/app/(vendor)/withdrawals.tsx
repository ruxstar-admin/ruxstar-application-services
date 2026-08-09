/**
 * Vendor Withdrawals Screen — "Earnings & withdrawals"
 * Mirrors the web's app/business/payments/page.tsx: summary totals, withdraw
 * panel (payout method + request withdrawal + history), and the payment ledger.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useAuthStore } from '@/stores/auth-store';
import { useKycStore } from '@/stores/kyc-store';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { BrandTokens } from '@/hooks/useTheme';
import VendorHeader from '@/components/vendor/VendorHeader';
import DropdownPicker, { type DropdownOption } from '@/components/ui/DropdownPicker';
import {
  VendorWithdrawalService,
  type PayoutMethod,
  type PayoutMethodInput,
  type PayoutMethodType,
  type VendorLedger,
  type VendorPayment,
  type Withdrawal,
  type WithdrawalStatus,
} from '@/services/vendor-withdrawal-service';

// ─── Constants ────────────────────────────────────────────────────────────────

type Filter = 'all' | 'holding' | 'withdrawable' | 'processing' | 'withdrawn' | 'refunded';

const FILTER_OPTIONS: DropdownOption[] = [
  { value: 'all',          label: 'All' },
  { value: 'holding',      label: 'In refund window' },
  { value: 'withdrawable', label: 'Withdrawable' },
  { value: 'processing',   label: 'Processing' },
  { value: 'withdrawn',    label: 'Withdrawn' },
  { value: 'refunded',     label: 'Refunded' },
];

const SOURCE_LABEL: Record<string, string> = {
  booking: 'Slot booking',
  print: 'Print order',
  event: 'Event',
};

const WITHDRAWAL_LABEL: Record<WithdrawalStatus, string> = {
  pending: 'Awaiting approval',
  processing: 'Processing',
  completed: 'Paid',
  failed: 'Failed',
  rejected: 'Rejected',
};

function formatINR(n: number): string {
  return `₹${Math.round(n || 0).toLocaleString('en-IN')}`;
}

function dateLabel(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });
}

function stageOf(p: VendorPayment): Filter {
  if (p.status === 'refunded' || p.refundStatus === 'refunded') return 'refunded';
  if (p.payoutRef) return 'withdrawn';
  if (p.withdrawalStatus === 'processing') return 'processing';
  if (p.matured) return 'withdrawable';
  return 'holding';
}

function stageUi(stage: Filter, brand: BrandTokens): { label: string; icon: keyof typeof Ionicons.glyphMap; color: string } {
  switch (stage) {
    case 'refunded':     return { label: 'Refunded',        icon: 'arrow-undo-outline',     color: brand.error };
    case 'withdrawn':    return { label: 'Withdrawn',       icon: 'checkmark-circle-outline', color: brand.primary };
    case 'processing':   return { label: 'Processing',      icon: 'time-outline',            color: brand.warning };
    case 'withdrawable': return { label: 'Withdrawable',    icon: 'cash-outline',            color: brand.success };
    case 'holding':      return { label: 'In refund window', icon: 'hourglass-outline',      color: brand.creamMuted };
    default:              return { label: '', icon: 'card-outline', color: brand.creamMuted };
  }
}

function withdrawalColor(status: WithdrawalStatus, brand: BrandTokens) {
  if (status === 'completed') return brand.success;
  if (status === 'failed' || status === 'rejected') return brand.error;
  return brand.warning;
}

// ─── Style factory ────────────────────────────────────────────────────────────

const createStyles = (brand: BrandTokens) => StyleSheet.create({
  // Shared pressed-state feedback — every button below applies this via the
  // Pressable(state => style) function form so taps actually feel responsive.
  pressed:  { opacity: 0.7 },

  screen:   { flex: 1, backgroundColor: brand.bg },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.four, gap: Spacing.two },

  // Horizontal spacing here is intentionally NOT re-applied — the FlatList's own
  // contentContainerStyle (listContent, below) already pads the whole content
  // area once. Adding it again here doubled up and squeezed the header in from
  // the edges compared to the payment rows underneath it.
  header: { paddingTop: Spacing.three, gap: 2 },
  eyebrow: { fontSize: 11, fontWeight: '700', color: brand.creamMuted, textTransform: 'uppercase', letterSpacing: 0.6 },
  title: { fontSize: 22, fontWeight: '800', color: brand.cream },
  sub: { fontSize: 12, color: brand.creamSub, lineHeight: 17, marginTop: 2 },

  statsScroll: { gap: Spacing.two, paddingVertical: Spacing.three },
  statCard: {
    width: 128, backgroundColor: brand.surface1, borderRadius: Radius.lg, borderWidth: 1, borderColor: brand.border1,
    padding: Spacing.two + 2, gap: 4,
  },
  statLabel: { fontSize: 11, color: brand.creamMuted },
  statValue: { fontSize: 17, fontWeight: '700' },

  // Withdraw panel
  panel: {
    marginBottom: Spacing.three, backgroundColor: brand.surface1,
    borderRadius: Radius.xl, borderWidth: 1, borderColor: brand.border1, padding: Spacing.three,
  },
  // Stacked, not side-by-side: amount block on top, action full-width below.
  // A row layout here overflows on narrow screens once amounts/labels get long
  // (badge text, ₹ amounts) — stacking is what wallet screens in most apps do
  // (GPay/PhonePe/CRED balance card pattern) and can never push a button off-screen.
  panelTop: { gap: Spacing.three },
  panelLabel: { fontSize: 11, fontWeight: '600', color: brand.creamMuted, textTransform: 'uppercase', letterSpacing: 0.4 },
  panelAmount: { fontSize: 24, fontWeight: '800', color: brand.success, marginTop: 4 },
  panelHint: { fontSize: 11, color: brand.creamMuted, marginTop: 2 },

  activeBadge: {
    borderRadius: Radius.lg, paddingHorizontal: Spacing.three, paddingVertical: 12,
    backgroundColor: 'rgba(217,119,6,0.10)', borderWidth: 1, borderColor: 'rgba(217,119,6,0.30)',
    alignItems: 'center',
  },
  activeBadgeText: { fontSize: 13, fontWeight: '600', color: brand.warning, textAlign: 'center' },

  withdrawBtn: { backgroundColor: brand.primary, borderRadius: Radius.pill, paddingHorizontal: Spacing.four, paddingVertical: 14, alignItems: 'center' },
  withdrawBtnDisabled: { opacity: 0.4 },
  withdrawBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  methodWarn: { fontSize: 11, color: brand.warning, marginTop: 6, textAlign: 'center' },

  msg: { fontSize: 12, marginTop: Spacing.two },
  msgOk: { color: brand.success },
  msgErr: { color: brand.error },

  divider: { height: 1, backgroundColor: brand.border1, marginVertical: Spacing.three },

  methodRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  methodText: { fontSize: 13, color: brand.creamSub, flex: 1 },
  methodMono: { fontFamily: Platform_MONO, color: brand.cream },
  changeBtn: { borderRadius: Radius.pill, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: brand.border2 },
  changeBtnText: { fontSize: 12, fontWeight: '600', color: brand.cream },

  // Payout method form
  typeRow: { flexDirection: 'row', gap: 8 },
  typeChip: { borderRadius: Radius.pill, paddingHorizontal: 14, paddingVertical: 7, borderWidth: 1, borderColor: brand.border2 },
  typeChipActive: { backgroundColor: 'rgba(22,163,74,0.12)', borderColor: brand.success },
  typeChipText: { fontSize: 12, fontWeight: '600', color: brand.creamSub },
  typeChipTextActive: { color: brand.success },

  formInput: {
    backgroundColor: brand.surface2, borderRadius: Radius.md, borderWidth: 1, borderColor: brand.border2,
    paddingHorizontal: Spacing.three, paddingVertical: 11, color: brand.cream, fontSize: 14, marginTop: Spacing.two,
  },
  formErr: { fontSize: 12, color: brand.error, marginTop: Spacing.two },
  accountHint: { fontSize: 11, color: brand.creamMuted, lineHeight: 15, marginTop: 6 },
  formActions: { flexDirection: 'row', gap: Spacing.two, marginTop: Spacing.three },
  saveBtn: { flex: 1, backgroundColor: brand.primary, borderRadius: Radius.pill, paddingVertical: 12, alignItems: 'center' },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  cancelBtn: { flex: 1, borderRadius: Radius.pill, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: brand.border2 },
  cancelBtnText: { color: brand.creamSub, fontSize: 13, fontWeight: '600' },

  // Withdrawal history
  historyTitle: { fontSize: 11, fontWeight: '600', color: brand.creamMuted, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: Spacing.two },
  historyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
  historyLeft: { flex: 1, gap: 2 },
  historyRef: { fontSize: 10, color: brand.creamMuted, fontFamily: Platform_MONO, textTransform: 'uppercase' },
  historyDate: { fontSize: 10, color: brand.creamMuted },
  historyFail: { fontSize: 10, color: brand.error },
  historyAmount: { fontSize: 13, fontWeight: '700', color: brand.cream, marginRight: 8 },

  smallPill: { borderRadius: Radius.pill, paddingHorizontal: 8, paddingVertical: 3 },
  smallPillText: { fontSize: 10, fontWeight: '700' },

  // Filter
  filterRow: { flexDirection: 'row', paddingBottom: Spacing.two },

  // Payment row
  listContent: { paddingHorizontal: Spacing.four, paddingBottom: 100 },
  txRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.two, backgroundColor: brand.surface1,
    borderRadius: Radius.lg, borderWidth: 1, borderColor: brand.border1, padding: Spacing.two + 2,
  },
  txIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  txInfo: { flex: 1, gap: 2 },
  txSource: { fontSize: 13, fontWeight: '600', color: brand.cream },
  txDate: { fontSize: 10, color: brand.creamMuted },
  txRef: { fontSize: 9, color: brand.creamMuted, fontFamily: Platform_MONO, textTransform: 'uppercase' },
  txRight: { alignItems: 'flex-end', gap: 4 },
  txAmount: { fontSize: 14, fontWeight: '700', color: brand.cream },
  txAmountRefunded: { color: brand.creamMuted, textDecorationLine: 'line-through' },

  gateWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.four, gap: Spacing.two },
  gateIconWrap: { width: 80, height: 80, borderRadius: Radius.xl, backgroundColor: 'rgba(217,119,6,0.08)', borderWidth: 1, borderColor: 'rgba(217,119,6,0.20)', alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.one },
  gateTitle: { fontSize: 20, fontWeight: '800', color: brand.cream },
  gateSub: { fontSize: 13, color: brand.creamSub, textAlign: 'center', lineHeight: 19 },
  gateBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: brand.primary, borderRadius: Radius.pill, paddingHorizontal: Spacing.four, paddingVertical: 14, marginTop: Spacing.two },
  gateBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  emptyIcon: { width: 68, height: 68, borderRadius: Radius.xl, backgroundColor: brand.surface1, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.two },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: brand.cream },
  emptySub: { fontSize: 12, color: brand.creamSub, textAlign: 'center' },

  errorText: { fontSize: 13, color: brand.error, textAlign: 'center' },
  retryBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: brand.primary, borderRadius: Radius.pill, paddingHorizontal: Spacing.four, paddingVertical: Spacing.two, marginTop: Spacing.one },
  retryBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
});

// react-native has no "monospace" family cross-platform; use the system default.
const Platform_MONO = undefined;

// ─── KYC gate ─────────────────────────────────────────────────────────────────

function KycGate() {
  const { brand } = useTheme();
  const s = useMemo(() => createStyles(brand), [brand]);
  return (
    <View style={s.gateWrap}>
      <View style={s.gateIconWrap}>
        <Ionicons name="shield-checkmark-outline" size={36} color={brand.warning} />
      </View>
      <Text style={s.gateTitle}>KYC required</Text>
      <Text style={s.gateSub}>Complete identity verification to access your earnings and withdrawals.</Text>
      <Pressable
        style={({ pressed }) => [s.gateBtn, pressed && s.pressed]}
        onPress={() => router.push('/(vendor)/kyc' as never)}
      >
        <Ionicons name="arrow-forward-circle-outline" size={16} color="#fff" />
        <Text style={s.gateBtnText}>Complete KYC</Text>
      </Pressable>
    </View>
  );
}

// ─── Payout method form ───────────────────────────────────────────────────────

function PayoutMethodForm({
  method, onDone, allowCancel, onSaved,
}: {
  method: PayoutMethod | null;
  onDone: () => void;
  allowCancel: boolean;
  onSaved: () => Promise<void>;
}) {
  const token = useAuthStore((s) => s.token);
  const { brand } = useTheme();
  const s = useMemo(() => createStyles(brand), [brand]);

  const [type, setType] = useState<PayoutMethodType>(method?.type ?? 'bank');
  const [accountName, setAccountName] = useState(method?.accountName ?? '');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifsc, setIfsc] = useState(method?.ifsc ?? '');
  const [vpa, setVpa] = useState(method?.vpa ?? '');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    if (!token || saving) return;
    setSaving(true);
    setErr(null);
    try {
      const input: PayoutMethodInput =
        type === 'vpa'
          ? { type, vpa: vpa.trim() }
          : { type, accountName: accountName.trim(), accountNumber: accountNumber.trim(), ifsc: ifsc.trim().toUpperCase() };
      await VendorWithdrawalService.updatePayoutMethod(input, token);
      await onSaved();
      onDone();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not save details.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <View>
      <View style={s.typeRow}>
        {(['bank', 'vpa'] as const).map((t) => {
          const active = type === t;
          return (
            <Pressable
              key={t}
              style={({ pressed }) => [s.typeChip, active && s.typeChipActive, pressed && s.pressed]}
              onPress={() => setType(t)}
            >
              <Text style={[s.typeChipText, active && s.typeChipTextActive]}>{t === 'bank' ? 'Bank account' : 'UPI'}</Text>
            </Pressable>
          );
        })}
      </View>

      {type === 'bank' ? (
        <>
          <TextInput
            style={s.formInput}
            placeholder="Account holder name"
            placeholderTextColor={brand.creamMuted}
            value={accountName}
            onChangeText={setAccountName}
            editable={!saving}
          />
          <TextInput
            style={s.formInput}
            placeholder="Account number"
            placeholderTextColor={brand.creamMuted}
            value={accountNumber}
            onChangeText={(v) => setAccountNumber(v.replace(/\s/g, ''))}
            keyboardType="number-pad"
            editable={!saving}
          />
          {method?.type === 'bank' && method.accountNumberMasked && (
            <Text style={s.accountHint}>
              Saved as {method.accountNumberMasked} — for security we never show the full number
              back to you, so re-enter it fully here to save any change.
            </Text>
          )}
          <TextInput
            style={s.formInput}
            placeholder="IFSC code"
            placeholderTextColor={brand.creamMuted}
            value={ifsc}
            onChangeText={(v) => setIfsc(v.toUpperCase())}
            autoCapitalize="characters"
            editable={!saving}
          />
        </>
      ) : (
        <TextInput
          style={s.formInput}
          placeholder="name@bank"
          placeholderTextColor={brand.creamMuted}
          value={vpa}
          onChangeText={setVpa}
          autoCapitalize="none"
          editable={!saving}
        />
      )}

      {err ? <Text style={s.formErr}>{err}</Text> : null}

      <View style={s.formActions}>
        {allowCancel && (
          <Pressable
            style={({ pressed }) => [s.cancelBtn, pressed && s.pressed]}
            onPress={onDone}
            disabled={saving}
          >
            <Text style={s.cancelBtnText}>Cancel</Text>
          </Pressable>
        )}
        <Pressable
          style={({ pressed }) => [s.saveBtn, saving && s.saveBtnDisabled, pressed && s.pressed]}
          onPress={submit}
          disabled={saving}
        >
          {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.saveBtnText}>Save payout details</Text>}
        </Pressable>
      </View>
    </View>
  );
}

// ─── Withdraw panel ───────────────────────────────────────────────────────────

function WithdrawPanel({ ledger, onChanged }: { ledger: VendorLedger; onChanged: () => Promise<void> }) {
  const token = useAuthStore((s) => s.token);
  const { brand } = useTheme();
  const s = useMemo(() => createStyles(brand), [brand]);

  const [editing, setEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  const { summary } = ledger;
  const method = summary.payoutMethod;
  const active = summary.activeWithdrawal;
  const withdrawable = summary.totals.withdrawable;

  async function onWithdraw() {
    if (!token) return;
    setSubmitting(true);
    setMsg(null);
    try {
      await VendorWithdrawalService.requestWithdrawal(token);
      await onChanged();
      setMsg({ kind: 'ok', text: "Withdrawal requested. We'll process it after admin approval." });
    } catch (e) {
      setMsg({ kind: 'err', text: e instanceof Error ? e.message : 'Could not request withdrawal.' });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={s.panel}>
      <View style={s.panelTop}>
        <View>
          <Text style={s.panelLabel}>Withdraw earnings</Text>
          <Text style={s.panelAmount}>{formatINR(withdrawable)}</Text>
          <Text style={s.panelHint}>available now (matured past the 7-day refund window)</Text>
        </View>

        {active ? (
          <View style={s.activeBadge}>
            <Text style={s.activeBadgeText}>{WITHDRAWAL_LABEL[active.status]} · {formatINR(active.amount)}</Text>
          </View>
        ) : (
          <View>
            <Pressable
              style={({ pressed }) => [
                s.withdrawBtn,
                (submitting || withdrawable <= 0 || !method) && s.withdrawBtnDisabled,
                pressed && s.pressed,
              ]}
              onPress={onWithdraw}
              disabled={submitting || withdrawable <= 0 || !method}
            >
              {submitting ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.withdrawBtnText}>Withdraw full balance</Text>}
            </Pressable>
            {!method && <Text style={s.methodWarn}>Add payout details to withdraw</Text>}
          </View>
        )}
      </View>

      {msg && <Text style={[s.msg, msg.kind === 'ok' ? s.msgOk : s.msgErr]}>{msg.text}</Text>}

      <View style={s.divider} />

      {editing || !method ? (
        <PayoutMethodForm method={method} onDone={() => setEditing(false)} allowCancel={!!method} onSaved={onChanged} />
      ) : (
        <View style={s.methodRow}>
          <Text style={s.methodText} numberOfLines={1}>
            {method.type === 'vpa'
              ? <>UPI · <Text style={s.methodMono}>{method.vpa}</Text></>
              : <>{method.accountName ? `${method.accountName} · ` : ''}<Text style={s.methodMono}>{method.accountNumberMasked}</Text>{method.ifsc ? ` · ${method.ifsc}` : ''}</>}
          </Text>
          <Pressable
            style={({ pressed }) => [s.changeBtn, pressed && s.pressed]}
            onPress={() => setEditing(true)}
          >
            <Text style={s.changeBtnText}>Change details</Text>
          </Pressable>
        </View>
      )}

      {summary.withdrawals.length > 0 && (
        <>
          <View style={s.divider} />
          <Text style={s.historyTitle}>Withdrawal history</Text>
          {summary.withdrawals.slice(0, 6).map((w) => (
            <WithdrawalHistoryRow key={w.id} withdrawal={w} />
          ))}
        </>
      )}
    </View>
  );
}

function WithdrawalHistoryRow({ withdrawal: w }: { withdrawal: Withdrawal }) {
  const { brand } = useTheme();
  const s = useMemo(() => createStyles(brand), [brand]);
  const color = withdrawalColor(w.status, brand);
  return (
    <View style={s.historyRow}>
      <View style={s.historyLeft}>
        <Text style={s.historyRef} numberOfLines={1}>{w.withdrawalRef}</Text>
        <Text style={s.historyDate}>{dateLabel(w.completedAt ?? w.requestedAt ?? w.createdAt)}</Text>
        {w.status === 'failed' && w.failureReason ? <Text style={s.historyFail}>{w.failureReason}</Text> : null}
      </View>
      <Text style={s.historyAmount}>{formatINR(w.amount)}</Text>
      <View style={[s.smallPill, { backgroundColor: `${color}22`, borderWidth: 1, borderColor: `${color}44` }]}>
        <Text style={[s.smallPillText, { color }]}>{WITHDRAWAL_LABEL[w.status]}</Text>
      </View>
    </View>
  );
}

// ─── Payment row ──────────────────────────────────────────────────────────────

function PaymentRow({ payment }: { payment: VendorPayment }) {
  const { brand } = useTheme();
  const s = useMemo(() => createStyles(brand), [brand]);
  const stage = stageOf(payment);
  const ui = stageUi(stage, brand);
  const refunded = stage === 'refunded';
  const ref = payment.refId;

  return (
    <View style={s.txRow}>
      <View style={[s.txIcon, { backgroundColor: `${ui.color}18` }]}>
        <Ionicons name={ui.icon} size={17} color={ui.color} />
      </View>
      <View style={s.txInfo}>
        <Text style={s.txSource} numberOfLines={1}>{SOURCE_LABEL[payment.source] || 'Payment'}</Text>
        <Text style={s.txDate}>{dateLabel(payment.paidAt)}</Text>
        {(ref || payment.payoutRef || payment.withdrawalRef) && (
          <Text style={s.txRef} numberOfLines={1}>
            {[ref, payment.payoutRef ?? payment.withdrawalRef].filter(Boolean).join(' · ')}
          </Text>
        )}
      </View>
      <View style={s.txRight}>
        <Text style={[s.txAmount, refunded && s.txAmountRefunded]}>{formatINR(payment.amount)}</Text>
        <View style={[s.smallPill, { backgroundColor: `${ui.color}22`, borderWidth: 1, borderColor: `${ui.color}44` }]}>
          <Text style={[s.smallPillText, { color: ui.color }]}>{ui.label}</Text>
        </View>
      </View>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function VendorWithdrawalsScreen() {
  const token = useAuthStore((s) => s.token);
  const kycStatus = useKycStore((s) => s.status);
  const { brand } = useTheme();
  const s = useMemo(() => createStyles(brand), [brand]);

  const kycVerified = kycStatus?.status === 'verified';

  const [ledger, setLedger] = useState<VendorLedger | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');

  const load = useCallback(async (isRefresh = false) => {
    if (!token || !kycVerified) return;
    try {
      isRefresh ? setRefreshing(true) : setLoading(true);
      setError(null);
      setLedger(await VendorWithdrawalService.getLedger(token));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load payments.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, kycVerified]);

  useEffect(() => { void load(); }, [load]);

  const payments = ledger?.payments ?? [];
  const totals = ledger?.summary.totals;

  const rows = useMemo(() => {
    const list = payments.filter((p) => (filter === 'all' ? true : stageOf(p) === filter));
    return [...list].sort((a, b) => new Date(b.paidAt ?? 0).getTime() - new Date(a.paidAt ?? 0).getTime());
  }, [payments, filter]);

  if (!kycVerified) {
    return (
      <SafeAreaView style={s.screen} edges={['top']}>
        <VendorHeader />
        <KycGate />
      </SafeAreaView>
    );
  }

  const statCards = totals ? [
    { label: 'Total earned', value: formatINR(totals.earned), color: brand.success },
    { label: 'Available to withdraw', value: formatINR(totals.withdrawable), color: brand.primary },
    { label: 'In refund window', value: formatINR(totals.holding), color: brand.cream },
    { label: 'Being processed', value: formatINR(totals.inProcess), color: brand.cream },
    { label: 'Withdrawn', value: formatINR(totals.withdrawn), color: brand.creamMuted },
  ] : [];

  return (
    <SafeAreaView style={s.screen} edges={['top']}>
      <VendorHeader />

      {loading ? (
        <View style={s.centered}>
          <ActivityIndicator size="large" color={brand.primary} />
        </View>
      ) : error ? (
        <View style={s.centered}>
          <Text style={s.errorText}>{error}</Text>
          <Pressable style={({ pressed }) => [s.retryBtn, pressed && s.pressed]} onPress={() => load()}>
            <Ionicons name="refresh-outline" size={14} color="#fff" />
            <Text style={s.retryBtnText}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(p) => p.id}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={brand.primary} />}
          ItemSeparatorComponent={() => <View style={{ height: Spacing.two }} />}
          ListHeaderComponent={
            <>
              <View style={s.header}>
                <Text style={s.eyebrow}>Payments</Text>
                <Text style={s.title}>Earnings & withdrawals</Text>
                <Text style={s.sub}>
                  Payments show up here instantly. After 7 days they mature and become available to withdraw.
                  Withdrawals are paid out once a week after admin approval.
                </Text>
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.statsScroll}>
                {statCards.map((c) => (
                  <View key={c.label} style={s.statCard}>
                    <Text style={s.statLabel}>{c.label}</Text>
                    <Text style={[s.statValue, { color: c.color }]} numberOfLines={1}>{c.value}</Text>
                  </View>
                ))}
              </ScrollView>

              {ledger && <WithdrawPanel ledger={ledger} onChanged={() => load(true)} />}

              <View style={s.filterRow}>
                <DropdownPicker options={FILTER_OPTIONS} value={filter} onChange={(v) => setFilter(v as Filter)} label="Filter payments" />
              </View>
            </>
          }
          ListEmptyComponent={
            <View style={s.centered}>
              <View style={s.emptyIcon}>
                <Ionicons name="card-outline" size={28} color={brand.primary} />
              </View>
              <Text style={s.emptyTitle}>
                {filter === 'refunded' ? 'No refunds yet.'
                  : filter === 'withdrawn' ? 'Nothing has been withdrawn yet.'
                  : filter === 'withdrawable' ? 'No matured funds available to withdraw yet.'
                  : filter === 'processing' ? 'No withdrawals are being processed.'
                  : filter === 'holding' ? 'No payments are in the refund window.'
                  : 'No payments yet.'}
              </Text>
            </View>
          }
          renderItem={({ item }) => <PaymentRow payment={item} />}
        />
      )}
    </SafeAreaView>
  );
}

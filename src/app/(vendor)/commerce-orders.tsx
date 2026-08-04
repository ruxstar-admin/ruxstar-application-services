/**
 * Vendor Commerce Orders
 * Mirrors: ruxstar-frontend-services/app/business/commerce-orders/page.tsx
 *
 * Lists all paid commerce orders across the vendor's shops.
 * Status workflow: confirmed → preparing → ready → completed
 */

import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Radius, Spacing } from '@/constants/theme';
import { useAuthStore } from '@/stores/auth-store';
import { useKycStore } from '@/stores/kyc-store';
import { useTheme } from '@/hooks/useTheme';
import VendorHeader from '@/components/vendor/VendorHeader';
import {
  listVendorCommerceOrders,
  updateVendorCommerceOrderStatus,
  type CommerceOrder,
} from '@/services/commerce-service';

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  pending_payment: 'Awaiting payment',
  confirmed:       'Paid',
  preparing:       'Preparing',
  ready:           'Ready for pickup',
  completed:       'Completed',
  cancelled:       'Cancelled',
  expired:         'Expired',
};

type StatusStyle = { bg: string; text: string; border: string };

function statusStyle(status: string): StatusStyle {
  switch (status) {
    case 'pending_payment': return { bg: 'rgba(245,166,35,0.10)', text: '#D97706', border: 'rgba(245,166,35,0.30)' };
    case 'confirmed':       return { bg: 'rgba(34,197,94,0.10)',  text: '#16A34A', border: 'rgba(34,197,94,0.30)'  };
    case 'preparing':       return { bg: 'rgba(124,58,237,0.10)', text: '#7C3AED', border: 'rgba(124,58,237,0.25)' };
    case 'ready':           return { bg: 'rgba(14,165,233,0.10)', text: '#0284C7', border: 'rgba(14,165,233,0.25)' };
    case 'completed':       return { bg: 'rgba(34,197,94,0.10)',  text: '#16A34A', border: 'rgba(34,197,94,0.30)'  };
    case 'cancelled':       return { bg: 'rgba(239,68,68,0.10)',  text: '#DC2626', border: 'rgba(239,68,68,0.25)'  };
    default:                return { bg: 'rgba(255,255,255,0.05)',text: '#9CA3AF', border: 'rgba(255,255,255,0.10)' };
  }
}

const NEXT: Partial<Record<string, { status: string; label: string }>> = {
  confirmed: { status: 'preparing', label: 'Start preparing' },
  preparing: { status: 'ready',     label: 'Mark ready for pickup' },
  ready:     { status: 'completed', label: 'Mark completed' },
};

function orderNo(id: string) {
  return '#' + id.replace(/-/g, '').slice(-8).toUpperCase();
}

function money(n: number) {
  return '₹' + n.toLocaleString('en-IN');
}

// ─── Order Card ───────────────────────────────────────────────────────────────

function OrderCard({
  order,
  onAdvance,
  busy,
}: {
  order:     CommerceOrder;
  onAdvance: (order: CommerceOrder) => void;
  busy:      boolean;
}) {
  const { brand } = useTheme();
  const next = NEXT[order.status];
  const ss   = statusStyle(order.status);

  return (
    <View style={[c.card, { backgroundColor: brand.surface1, borderColor: brand.border1 }]}>
      <View style={c.row}>
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={[c.orderNo, { color: brand.cream }]}>
            {orderNo(order.id)} · {order.businessName}
          </Text>
          <Text style={[c.customer, { color: brand.creamSub }]}>
            {order.customerName || 'Customer'}
            {order.paymentStatus === 'paid' && order.customerMobile
              ? ` · ${order.customerMobile}`
              : ''}
          </Text>
          <Text style={[c.items, { color: brand.creamSub }]}>
            {order.items.map((i) => `${i.quantity}× ${i.name}`).join(', ')}
          </Text>
        </View>

        <View style={{ alignItems: 'flex-end', gap: 6 }}>
          <View style={[c.badge, { backgroundColor: ss.bg, borderColor: ss.border }]}>
            <Text style={[c.badgeText, { color: ss.text }]}>
              {STATUS_LABELS[order.status] ?? order.status}
            </Text>
          </View>
          <Text style={[c.amount, { color: brand.success }]}>{money(order.amount)}</Text>
        </View>
      </View>

      {next && (
        <Pressable
          style={({ pressed }) => [c.advBtn, { opacity: busy || pressed ? 0.55 : 1 }]}
          onPress={() => onAdvance(order)}
          disabled={busy}
        >
          {busy ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={c.advBtnText}>{next.label}</Text>
          )}
        </Pressable>
      )}
    </View>
  );
}

const c = StyleSheet.create({
  card:       { borderRadius: Radius.xl, borderWidth: 1, padding: Spacing.three, gap: Spacing.two },
  row:        { flexDirection: 'row', gap: Spacing.two },
  orderNo:    { fontSize: 13, fontWeight: '700' },
  customer:   { fontSize: 11 },
  items:      { fontSize: 12, marginTop: 2 },
  badge:      { borderRadius: Radius.pill, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 3 },
  badgeText:  { fontSize: 10, fontWeight: '700' },
  amount:     { fontSize: 14, fontWeight: '700' },
  advBtn:     { backgroundColor: '#7C3AED', borderRadius: Radius.pill, paddingVertical: 8, paddingHorizontal: Spacing.three, alignItems: 'center' },
  advBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
});

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, accent }: { label: string; value: number; accent?: string }) {
  const { brand } = useTheme();
  return (
    <View style={[st.card, { backgroundColor: brand.surface1, borderColor: brand.border1 }]}>
      <Text style={[st.label, { color: brand.creamMuted }]}>{label}</Text>
      <Text style={[st.value, { color: accent ?? brand.cream }]}>{value}</Text>
    </View>
  );
}

const st = StyleSheet.create({
  card:  { flex: 1, borderRadius: Radius.xl, borderWidth: 1, padding: Spacing.three },
  label: { fontSize: 11, marginBottom: 4 },
  value: { fontSize: 22, fontWeight: '800' },
});

// ─── KYC Gate ─────────────────────────────────────────────────────────────────

function KycGate() {
  const { brand } = useTheme();
  return (
    <View style={[kg.wrap, { backgroundColor: brand.surface1, borderColor: brand.border1 }]}>
      <Text style={kg.lock}>🔒</Text>
      <Text style={[kg.title, { color: brand.cream }]}>Ruxstar Card required</Text>
      <Text style={[kg.sub, { color: brand.creamSub }]}>
        Verify your identity to manage commerce orders.
      </Text>
      <Pressable style={kg.btn} onPress={() => router.push('/(vendor)/kyc' as never)}>
        <Text style={kg.btnText}>Get your Ruxstar Card</Text>
      </Pressable>
    </View>
  );
}

const kg = StyleSheet.create({
  wrap:    { margin: Spacing.four, borderRadius: Radius.xxl, borderWidth: 1, padding: Spacing.five, alignItems: 'center', gap: Spacing.two },
  lock:    { fontSize: 40 },
  title:   { fontSize: 18, fontWeight: '700', textAlign: 'center' },
  sub:     { fontSize: 13, textAlign: 'center', lineHeight: 19 },
  btn:     { marginTop: Spacing.two, backgroundColor: '#7C3AED', borderRadius: Radius.pill, paddingHorizontal: Spacing.four, paddingVertical: 12 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function VendorCommerceOrdersScreen() {
  const token     = useAuthStore((s) => s.token);
  const kycStatus = useKycStore((s) => s.status);
  const { brand } = useTheme();

  const kycVerified = kycStatus?.status === 'verified';

  const [orders,    setOrders]    = useState<CommerceOrder[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [refreshing,setRefreshing]= useState(false);
  const [error,     setError]     = useState('');
  const [busyId,    setBusyId]    = useState('');

  const load = useCallback(async (isRefresh = false) => {
    if (!token || !kycVerified) { setLoading(false); return; }
    try {
      isRefresh ? setRefreshing(true) : setLoading(true);
      setError('');
      setOrders(await listVendorCommerceOrders(token));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not load orders');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, kycVerified]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const stats = useMemo(() => {
    const active    = orders.filter((o) => ['confirmed', 'preparing', 'ready'].includes(o.status)).length;
    const completed = orders.filter((o) => o.status === 'completed').length;
    return { total: orders.length, active, completed };
  }, [orders]);

  async function handleAdvance(order: CommerceOrder) {
    const next = NEXT[order.status];
    if (!next || !token) return;
    setBusyId(order.id);
    setError('');
    try {
      const updated = await updateVendorCommerceOrderStatus(token, order.id, next.status);
      setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not update status');
    } finally {
      setBusyId('');
    }
  }

  return (
    <SafeAreaView style={[s.screen, { backgroundColor: brand.bg }]} edges={['top']}>
      <VendorHeader />

      {!kycVerified ? (
        <KycGate />
      ) : loading ? (
        <View style={s.centered}>
          <ActivityIndicator size="large" color={brand.primary} />
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(o) => o.id}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => load(true)}
              tintColor={brand.primary}
            />
          }
          ListHeaderComponent={
            <>
              <View style={s.statsRow}>
                <StatCard label="All"         value={stats.total}     />
                <StatCard label="In progress" value={stats.active}    accent={brand.success} />
                <StatCard label="Completed"   value={stats.completed} />
              </View>

              {!!error && (
                <View style={[s.errorBox, { backgroundColor: 'rgba(239,68,68,0.08)', borderColor: 'rgba(239,68,68,0.20)' }]}>
                  <Text style={{ color: '#EF4444', fontSize: 13 }}>{error}</Text>
                </View>
              )}
            </>
          }
          ListEmptyComponent={
            <View style={s.empty}>
              <Text style={s.emptyEmoji}>🛍️</Text>
              <Text style={[s.emptyTitle, { color: brand.cream }]}>No paid orders yet</Text>
              <Text style={[s.emptySub, { color: brand.creamSub }]}>
                Commerce orders will appear here once customers pay.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <OrderCard
              order={item}
              onAdvance={handleAdvance}
              busy={busyId === item.id}
            />
          )}
          ItemSeparatorComponent={() => <View style={{ height: Spacing.two + 2 }} />}
        />
      )}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  screen:   { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list:     { padding: Spacing.four, gap: Spacing.three, paddingBottom: 100 },

  statsRow: { flexDirection: 'row', gap: Spacing.two, marginBottom: Spacing.two },
  errorBox: { borderRadius: Radius.lg, borderWidth: 1, padding: Spacing.two, marginBottom: Spacing.two },

  empty:      { alignItems: 'center', paddingTop: Spacing.five, gap: Spacing.two },
  emptyEmoji: { fontSize: 44 },
  emptyTitle: { fontSize: 17, fontWeight: '700' },
  emptySub:   { fontSize: 13, textAlign: 'center', lineHeight: 19, paddingHorizontal: Spacing.four },
});

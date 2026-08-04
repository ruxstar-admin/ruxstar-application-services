/**
 * Vendor Print Orders Screen
 * Stats row · FlatList of assigned orders · quick-action status buttons
 */

import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useAuthStore } from '@/stores/auth-store';
import { useBusinessStore } from '@/stores/business-store';
import {
  listVendorPrintOrders,
  updatePrintOrderStatus,
  getPrintVendorProfile,
  setPrintAcceptingOrders,
} from '@/services/print-service';
import type { PrintOrder, PrintOrderStatus } from '@/types/print';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { BrandTokens } from '@/hooks/useTheme';
import VendorHeader from '@/components/vendor/VendorHeader';

// ─── Style factory ────────────────────────────────────────────────────────────

const createStyles = (brand: BrandTokens) => StyleSheet.create({
  screen:  { flex: 1, backgroundColor: brand.bg },
  centered: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    padding: Spacing.four, gap: Spacing.two,
  },

  statsHeader: {
    flexDirection: 'row', alignItems: 'baseline', gap: Spacing.two,
    paddingHorizontal: Spacing.four, paddingTop: Spacing.three, paddingBottom: Spacing.two,
  },
  statsTitle:   { fontSize: 18, fontWeight: '800', color: brand.cream, letterSpacing: -0.3 },
  statsBadge:   { fontSize: 22, fontWeight: '800', color: brand.primary, letterSpacing: -0.5 },

  filterRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two,
    paddingHorizontal: Spacing.four, paddingBottom: Spacing.two,
  },
  filterPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: Spacing.three, paddingVertical: Spacing.one + 3,
    borderRadius: Radius.pill, backgroundColor: brand.surface1,
    borderWidth: 1, borderColor: brand.border1,
  },
  filterPillActive:     { backgroundColor: brand.primary, borderColor: brand.primary },
  filterPillText:       { fontSize: 13, color: brand.creamSub, fontWeight: '600' },
  filterPillTextActive: { color: '#fff' },
  filterPillCount: {
    fontSize: 11, fontWeight: '700', color: brand.cream,
    backgroundColor: brand.surface2, borderRadius: Radius.pill,
    paddingHorizontal: 6, paddingVertical: 1, overflow: 'hidden',
  },
  filterPillCountActive: { backgroundColor: 'rgba(255,255,255,0.25)', color: '#fff' },

  listContent: { paddingHorizontal: Spacing.four, paddingBottom: Spacing.six, gap: Spacing.two },

  orderCard: {
    backgroundColor: brand.surface1, borderRadius: Radius.lg,
    borderWidth: 1, borderColor: brand.border1,
    padding: Spacing.three, gap: Spacing.two,
  },
  orderCardPressed: { opacity: 0.82 },

  orderTop: {
    flexDirection: 'row', alignItems: 'flex-start',
    justifyContent: 'space-between', gap: Spacing.two,
  },
  orderMeta:     { flex: 1 },
  orderCategory: { fontSize: 15, fontWeight: '700', color: brand.cream },
  orderCustomer: { fontSize: 12, color: brand.creamSub, marginTop: 2 },
  orderQty:      { fontSize: 11, color: brand.creamMuted, marginTop: 2 },

  orderRight:  { alignItems: 'flex-end', gap: Spacing.one },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: Radius.pill, paddingHorizontal: Spacing.two, paddingVertical: 3, gap: 4,
  },
  statusDot:  { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontWeight: '600' },

  orderAmount: { fontSize: 14, fontWeight: '700', color: brand.cream },

  advanceBtn: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.one + 2,
    alignSelf: 'flex-start', borderWidth: 1, borderColor: brand.primary,
    borderRadius: Radius.pill, paddingHorizontal: Spacing.three, paddingVertical: Spacing.one + 2,
  },
  advanceBtnDisabled: { opacity: 0.5 },
  advanceBtnText:     { fontSize: 12, fontWeight: '600', color: brand.primary },

  emptyIcon:  { fontSize: 40 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: brand.cream },
  emptySub:   { fontSize: 13, color: brand.creamSub, textAlign: 'center', lineHeight: 19 },

  errorText:    { color: brand.error, textAlign: 'center', fontSize: 14 },
  retryBtn:     { backgroundColor: brand.primary, borderRadius: Radius.pill, paddingHorizontal: Spacing.four, paddingVertical: Spacing.two },
  retryBtnText: { color: '#fff', fontWeight: '600' },
});

const createBannerStyles = (brand: BrandTokens) => StyleSheet.create({
  wrap: { marginHorizontal: Spacing.four, marginBottom: Spacing.two, gap: Spacing.one },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.two,
    backgroundColor: `${brand.success}0D`, borderWidth: 1,
    borderColor: `${brand.success}30`, borderRadius: Radius.lg,
    paddingHorizontal: Spacing.three, paddingVertical: Spacing.two,
  },
  rowClosed:  { backgroundColor: `${brand.error}0D`, borderColor: `${brand.error}30` },
  dot:        { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  text:       { flex: 1, fontSize: 13, fontWeight: '600', color: brand.success },
  textClosed: { color: brand.error },
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

const money = (n: number | null) =>
  n == null ? '—' : `₹${Math.round(n).toLocaleString('en-IN')}`;

function statusColor(status: string, brand: BrandTokens): string {
  switch (status) {
    case 'open':
    case 'accepted':       return brand.warning;
    case 'confirmed':
    case 'in_production':  return brand.primary;
    case 'ready':
    case 'completed':      return brand.success;
    case 'cancelled':
    case 'expired':        return brand.error;
    default:               return brand.creamSub;
  }
}

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    open:            'New',
    accepted:        'Accepted',
    pending_payment: 'Awaiting payment',
    confirmed:       'Payment confirmed',
    in_production:   'In production',
    ready:           'Ready',
    completed:       'Completed',
    cancelled:       'Cancelled',
    expired:         'Expired',
  };
  return map[status] ?? status;
}

function nextStatus(status: string): string | null {
  switch (status) {
    case 'open':          return 'accepted';
    case 'confirmed':     return 'in_production';
    case 'in_production': return 'ready';
    case 'ready':         return 'completed';
    default:              return null;
  }
}

function nextStatusLabel(status: string): string | null {
  switch (status) {
    case 'open':          return 'Accept';
    case 'confirmed':     return 'Start production';
    case 'in_production': return 'Mark ready';
    case 'ready':         return 'Mark complete';
    default:              return null;
  }
}

// ─── Shop status banner ───────────────────────────────────────────────────────

function ShopStatusBanner({ token }: { token: string }) {
  const { brand } = useTheme();
  const sb = useMemo(() => createBannerStyles(brand), [brand]);
  const businesses = useBusinessStore((s) => s.businesses);
  const commerce   = useMemo(() => businesses.filter((b) => b.module === 'commerce'), [businesses]);

  const [accepting,  setAccepting]  = useState<Record<string, boolean>>({});
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useFocusEffect(useCallback(() => {
    if (!token || commerce.length === 0) return;
    for (const biz of commerce) {
      void getPrintVendorProfile(token, biz.id).then((profile) => {
        if (profile != null) {
          setAccepting((prev) => ({ ...prev, [biz.id]: profile.acceptingOrders }));
        }
      });
    }
  }, [token, commerce]));

  async function handleToggle(businessId: string) {
    const current = accepting[businessId] ?? true;
    const next    = !current;
    setTogglingId(businessId);
    setAccepting((prev) => ({ ...prev, [businessId]: next }));
    try {
      await setPrintAcceptingOrders(token, businessId, next);
    } catch {
      setAccepting((prev) => ({ ...prev, [businessId]: current }));
      Alert.alert('Error', 'Could not update shop status. Try again.');
    } finally {
      setTogglingId(null);
    }
  }

  if (commerce.length === 0 || Object.keys(accepting).length === 0) return null;

  return (
    <View style={sb.wrap}>
      {commerce.map((biz) => {
        const isOpen   = accepting[biz.id] ?? true;
        const toggling = togglingId === biz.id;
        return (
          <View key={biz.id} style={[sb.row, !isOpen && sb.rowClosed]}>
            <View style={[sb.dot, { backgroundColor: isOpen ? brand.success : brand.error }]} />
            <Text style={[sb.text, !isOpen && sb.textClosed]} numberOfLines={1}>
              {commerce.length > 1 ? `${biz.name} · ` : ''}
              {isOpen ? 'Accepting orders' : 'Paused — not accepting orders'}
            </Text>
            {toggling ? (
              <ActivityIndicator size="small" color={brand.primary} />
            ) : (
              <Switch
                value={isOpen}
                onValueChange={() => void handleToggle(biz.id)}
                trackColor={{ false: `${brand.error}35`, true: `${brand.success}35` }}
                thumbColor={isOpen ? brand.success : brand.error}
                ios_backgroundColor={`${brand.error}35`}
              />
            )}
          </View>
        );
      })}
    </View>
  );
}

// ─── Filter pill ─────────────────────────────────────────────────────────────

function FilterPill({
  label, count, active, onPress,
}: { label: string; count: number; active: boolean; onPress: () => void }) {
  const { brand } = useTheme();
  const s = useMemo(() => createStyles(brand), [brand]);
  return (
    <Pressable
      style={[s.filterPill, active && s.filterPillActive]}
      onPress={onPress}
    >
      <Text style={[s.filterPillText, active && s.filterPillTextActive]}>{label}</Text>
      <Text style={[s.filterPillCount, active && s.filterPillCountActive]}>{count}</Text>
    </Pressable>
  );
}

// ─── Order row ────────────────────────────────────────────────────────────────

function OrderRow({
  order, onAdvance, advancing,
}: {
  order: PrintOrder;
  onAdvance: (order: PrintOrder, next: string) => void;
  advancing: boolean;
}) {
  const { brand } = useTheme();
  const s = useMemo(() => createStyles(brand), [brand]);
  const next      = nextStatus(order.status);
  const nextLabel = nextStatusLabel(order.status);
  const color     = statusColor(order.status, brand);

  return (
    <Pressable
      style={({ pressed }) => [s.orderCard, pressed && s.orderCardPressed]}
      onPress={() => router.push(`/(vendor)/print-order-detail?orderId=${order.id}` as never)}
      accessibilityRole="button"
    >
      <View style={s.orderTop}>
        <View style={s.orderMeta}>
          <Text style={s.orderCategory} numberOfLines={1}>{order.categoryLabel}</Text>
          <Text style={s.orderCustomer} numberOfLines={1}>
            {order.customerName} · {order.city}
          </Text>
          {order.quantity ? (
            <Text style={s.orderQty}>Qty: {order.quantity}</Text>
          ) : null}
        </View>

        <View style={s.orderRight}>
          <View style={[s.statusBadge, { backgroundColor: `${color}18` }]}>
            <View style={[s.statusDot, { backgroundColor: color }]} />
            <Text style={[s.statusText, { color }]}>{statusLabel(order.status)}</Text>
          </View>
          {order.quoteAmount != null && (
            <Text style={s.orderAmount}>{money(order.quoteAmount)}</Text>
          )}
        </View>
      </View>

      {next && nextLabel && (
        <Pressable
          style={[s.advanceBtn, advancing && s.advanceBtnDisabled]}
          onPress={() => onAdvance(order, next)}
          disabled={advancing}
        >
          {advancing
            ? <ActivityIndicator size="small" color={brand.primary} />
            : (
              <>
                <Ionicons name="arrow-forward-circle-outline" size={14} color={brand.primary} />
                <Text style={s.advanceBtnText}>{nextLabel}</Text>
              </>
            )
          }
        </Pressable>
      )}
    </Pressable>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function VendorPrintOrdersScreen() {
  const token = useAuthStore((s) => s.token);
  const { brand } = useTheme();
  const s = useMemo(() => createStyles(brand), [brand]);

  const [orders,      setOrders]      = useState<PrintOrder[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [advancingId, setAdvancingId] = useState<string | null>(null);
  const [filter,      setFilter]      = useState<'all' | 'awaiting_payment' | 'in_progress' | 'completed'>('all');

  const load = useCallback(async (isRefresh = false) => {
    if (!token) return;
    try {
      isRefresh ? setRefreshing(true) : setLoading(true);
      setError(null);
      const result = await listVendorPrintOrders(token);
      setOrders(result.assigned);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load orders');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const handleAdvance = useCallback(async (order: PrintOrder, next: string) => {
    if (!token) return;
    const nextLabel = nextStatusLabel(order.status) ?? 'Update';
    Alert.alert(
      nextLabel,
      `Move "${order.categoryLabel}" order to "${statusLabel(next)}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: nextLabel,
          onPress: async () => {
            setAdvancingId(order.id);
            try {
              const updated = await updatePrintOrderStatus(token, order.id, next as PrintOrderStatus);
              setOrders((prev) => prev.map((o) => (o.id === order.id ? updated : o)));
            } catch (e: unknown) {
              Alert.alert('Error', e instanceof Error ? e.message : 'Could not update status');
            } finally {
              setAdvancingId(null);
            }
          },
        },
      ],
    );
  }, [token]);

  const counts = {
    all:              orders.length,
    awaiting_payment: orders.filter((o) => o.status === 'pending_payment').length,
    in_progress:      orders.filter((o) => ['open', 'accepted', 'confirmed', 'in_production', 'ready'].includes(o.status)).length,
    completed:        orders.filter((o) => o.status === 'completed').length,
  };

  const displayed = orders.filter((o) => {
    if (filter === 'awaiting_payment') return o.status === 'pending_payment';
    if (filter === 'in_progress')      return ['open', 'accepted', 'confirmed', 'in_production', 'ready'].includes(o.status);
    if (filter === 'completed')        return o.status === 'completed';
    return true;
  });

  return (
    <SafeAreaView style={s.screen} edges={['top']}>
      <VendorHeader />

      {/* Orders total */}
      <View style={s.statsHeader}>
        <Text style={s.statsTitle}>Orders</Text>
        <Text style={s.statsBadge}>{counts.all}</Text>
      </View>

      {/* Filter pills with counts */}
      <View style={s.filterRow}>
        <FilterPill label="All orders"        count={counts.all}              active={filter === 'all'}              onPress={() => setFilter('all')}              />
        <FilterPill label="Awaiting payment"  count={counts.awaiting_payment} active={filter === 'awaiting_payment'} onPress={() => setFilter('awaiting_payment')} />
        <FilterPill label="In progress"       count={counts.in_progress}      active={filter === 'in_progress'}      onPress={() => setFilter('in_progress')}      />
        <FilterPill label="Completed"         count={counts.completed}        active={filter === 'completed'}        onPress={() => setFilter('completed')}        />
      </View>

      {loading ? (
        <View style={s.centered}>
          <ActivityIndicator size="large" color={brand.primary} />
        </View>
      ) : error ? (
        <View style={s.centered}>
          <Ionicons name="cloud-offline-outline" size={36} color={brand.creamMuted} />
          <Text style={s.errorText}>{error}</Text>
          <Pressable style={s.retryBtn} onPress={() => void load()}>
            <Text style={s.retryBtnText}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={displayed}
          keyExtractor={(o) => o.id}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void load(true)}
              tintColor={brand.primary}
            />
          }
          renderItem={({ item }) => (
            <OrderRow
              order={item}
              onAdvance={handleAdvance}
              advancing={advancingId === item.id}
            />
          )}
          ListEmptyComponent={
            <View style={s.centered}>
              <Text style={s.emptyIcon}>🖨️</Text>
              <Text style={s.emptyTitle}>No orders here</Text>
              <Text style={s.emptySub}>
                {filter === 'all'
                  ? 'You have no print orders assigned yet.'
                  : filter === 'awaiting_payment'
                  ? 'No orders awaiting payment.'
                  : filter === 'in_progress'
                  ? 'No orders in progress right now.'
                  : 'No completed orders yet.'}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

/**
 * Vendor Payments Screen
 * Earnings metrics → two dropdowns (Status + Business) → transaction list
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useAuthStore } from '@/stores/auth-store';
import { useKycStore } from '@/stores/kyc-store';
import {
  listVendorBookings,
  dayParts,
  formatTime12,
  type VendorBooking,
} from '@/services/booking-service';
import {
  computeVendorMetrics,
  formatINR,
  isPaid,
  bookingAmount,
} from '@/services/vendor-metrics';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { BrandTokens } from '@/hooks/useTheme';
import VendorHeader from '@/components/vendor/VendorHeader';
import DropdownPicker, { type DropdownOption } from '@/components/ui/DropdownPicker';

// ─── Types & constants ────────────────────────────────────────────────────────

type PayFilter = 'all' | 'paid' | 'upcoming' | 'refunded';

const STATUS_OPTIONS: DropdownOption[] = [
  { value: 'all',      label: 'All transactions' },
  { value: 'paid',     label: 'Paid'             },
  { value: 'upcoming', label: 'Upcoming'         },
  { value: 'refunded', label: 'Refunded'         },
];

// ─── Style factory ────────────────────────────────────────────────────────────

const createStyles = (brand: BrandTokens) => StyleSheet.create({
  screen:   { flex: 1, backgroundColor: brand.bg },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.four, gap: Spacing.two },

  statsStrip: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.four, paddingVertical: Spacing.two + 2,
    borderBottomWidth: 1, borderBottomColor: brand.border1,
  },
  statItem:   { flex: 1, alignItems: 'center', gap: 2 },
  statValue:  { fontSize: 13, fontWeight: '800', color: brand.cream, letterSpacing: -0.2 },
  statLabel:  { fontSize: 10, color: brand.creamMuted, fontWeight: '500' },
  statDiv:    { width: 1, height: 28, backgroundColor: brand.border1 },

  dropdownRow: {
    flexDirection: 'row', gap: Spacing.two,
    paddingHorizontal: Spacing.four, paddingVertical: Spacing.two,
    borderBottomWidth: 1, borderBottomColor: brand.border1,
  },
  listContent: { paddingHorizontal: Spacing.four, paddingTop: Spacing.two, paddingBottom: 100 },

  // Transaction row
  txRow:      { flexDirection: 'row', alignItems: 'center', backgroundColor: brand.surface1, borderRadius: Radius.md, marginBottom: Spacing.two, borderWidth: 1, borderColor: brand.border1, overflow: 'hidden' },
  txDateCube: { alignItems: 'center', justifyContent: 'center', width: 46, paddingVertical: Spacing.three, paddingLeft: Spacing.one },
  txCubeWd:   { fontSize: 9, color: brand.creamMuted, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: '600' },
  txCubeDay:  { fontSize: 20, fontWeight: '800', color: brand.cream, lineHeight: 24 },
  txCubeMo:   { fontSize: 9, color: brand.creamSub, fontWeight: '500' },
  txDivider:  { width: 1, height: '55%', backgroundColor: brand.border1 },
  txInfo:     { flex: 1, paddingHorizontal: Spacing.two, paddingVertical: Spacing.two, gap: 3 },
  txCustomer: { fontSize: 13, fontWeight: '700', color: brand.cream },
  txMetaBiz:  { fontSize: 10, color: brand.primary, fontWeight: '600', flex: 1 },
  txMetaTime: { fontSize: 10, color: brand.creamSub },
  txRight:    { paddingRight: Spacing.three, paddingLeft: Spacing.one, alignItems: 'flex-end', gap: 5 },
  txAmount:   { fontSize: 14, fontWeight: '800', color: brand.cream },
  txBadge:    { borderRadius: Radius.pill, paddingHorizontal: Spacing.two, paddingVertical: 2 },
  txBadgeText:{ fontSize: 10, fontWeight: '700' },

  // KYC gate
  gateWrap:    { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.four, gap: Spacing.two },
  gateIconWrap:{ width: 80, height: 80, borderRadius: Radius.xl, backgroundColor: 'rgba(217,119,6,0.08)', borderWidth: 1, borderColor: 'rgba(217,119,6,0.20)', alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.one },
  gateTitle:   { fontSize: 20, fontWeight: '800', color: brand.cream },
  gateSub:     { fontSize: 13, color: brand.creamSub, textAlign: 'center', lineHeight: 19, paddingHorizontal: Spacing.four },
  gateBtn:     { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: brand.primary, borderRadius: Radius.pill, paddingHorizontal: Spacing.four, paddingVertical: 14, marginTop: Spacing.two },
  gateBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  emptyIconWrap: { width: 72, height: 72, borderRadius: Radius.xl, backgroundColor: brand.primaryGlow, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.two },
  emptyTitle:    { fontSize: 17, fontWeight: '700', color: brand.cream },
  emptySub:      { fontSize: 13, color: brand.creamSub },

  errorIconWrap: { width: 72, height: 72, borderRadius: Radius.xl, backgroundColor: brand.surface1, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.two },
  errorTitle:    { fontSize: 16, fontWeight: '700', color: brand.cream },
  errorText:     { fontSize: 13, color: brand.creamSub, textAlign: 'center' },
  retryBtn:      { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: brand.primary, borderRadius: Radius.pill, paddingHorizontal: Spacing.four, paddingVertical: Spacing.two, marginTop: Spacing.one },
  retryBtnText:  { color: '#fff', fontWeight: '700', fontSize: 13 },
  loadingText:   { fontSize: 13, color: brand.creamSub, marginTop: 4 },
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function filterBookings(bookings: VendorBooking[], tab: PayFilter): VendorBooking[] {
  const now = Date.now();
  switch (tab) {
    case 'paid':     return bookings.filter(isPaid);
    case 'upcoming': return bookings.filter((b) => isPaid(b) && new Date(b.startAt).getTime() > now);
    case 'refunded': return bookings.filter((b) => b.status === 'cancelled');
    default:         return bookings;
  }
}

function txStatusChip(b: VendorBooking, brand: BrandTokens): { label: string; color: string; bg: string } {
  if (b.status === 'cancelled') return { label: 'Refunded', color: brand.error,   bg: 'rgba(220,38,38,0.08)' };
  if (isPaid(b))                return { label: 'Paid',     color: brand.success, bg: 'rgba(22,163,74,0.10)'  };
  return                               { label: 'Upcoming', color: '#D97706',     bg: 'rgba(217,119,6,0.08)' };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function TxRow({ booking }: { booking: VendorBooking }) {
  const { brand } = useTheme();
  const s = useMemo(() => createStyles(brand), [brand]);
  const { weekday, day, month } = dayParts(booking.startAt);
  const amount = bookingAmount(booking);
  const chip   = txStatusChip(booking, brand);

  return (
    <View style={s.txRow}>
      <View style={[{ width: 3, alignSelf: 'stretch' as const, backgroundColor: chip.color }]} />
      <View style={s.txDateCube}>
        <Text style={s.txCubeWd}>{weekday}</Text>
        <Text style={s.txCubeDay}>{day}</Text>
        <Text style={s.txCubeMo}>{month}</Text>
      </View>
      <View style={s.txDivider} />
      <View style={s.txInfo}>
        <Text style={s.txCustomer} numberOfLines={1}>{booking.customerName || 'Customer'}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Ionicons name="business-outline" size={10} color={brand.primary} />
          <Text style={s.txMetaBiz} numberOfLines={1}>{booking.businessName}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Ionicons name="time-outline" size={10} color={brand.creamMuted} />
          <Text style={s.txMetaTime}>{formatTime12(booking.startAt)}</Text>
        </View>
      </View>
      <View style={s.txRight}>
        {amount > 0 && <Text style={s.txAmount}>₹{amount.toLocaleString('en-IN')}</Text>}
        <View style={[s.txBadge, { backgroundColor: chip.bg }]}>
          <Text style={[s.txBadgeText, { color: chip.color }]}>{chip.label}</Text>
        </View>
      </View>
    </View>
  );
}

function KycGate() {
  const { brand } = useTheme();
  const s = useMemo(() => createStyles(brand), [brand]);
  return (
    <View style={s.gateWrap}>
      <View style={s.gateIconWrap}>
        <Ionicons name="shield-checkmark-outline" size={36} color={brand.warning} />
      </View>
      <Text style={s.gateTitle}>KYC required</Text>
      <Text style={s.gateSub}>Complete identity verification to access your earnings and payments.</Text>
      <Pressable style={s.gateBtn} onPress={() => router.push('/(vendor)/kyc' as never)}>
        <Ionicons name="arrow-forward-circle-outline" size={16} color="#fff" />
        <Text style={s.gateBtnText}>Complete KYC</Text>
      </Pressable>
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function VendorPaymentsScreen() {
  const token     = useAuthStore((s) => s.token);
  const kycStatus = useKycStore((s) => s.status);
  const { brand } = useTheme();
  const s = useMemo(() => createStyles(brand), [brand]);

  const [bookings,      setBookings]      = useState<VendorBooking[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [refreshing,    setRefreshing]    = useState(false);
  const [error,         setError]         = useState<string | null>(null);
  const [activeTab,     setActiveTab]     = useState<PayFilter>('paid');
  const [selectedBizId, setSelectedBizId] = useState<string>('all');

  const kycVerified = kycStatus?.status === 'verified';

  const load = useCallback(async (isRefresh = false) => {
    if (!token) return;
    try {
      isRefresh ? setRefreshing(true) : setLoading(true);
      setError(null);
      setBookings(await listVendorBookings(token));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load payments');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const bizOptions = useMemo<DropdownOption[]>(() => {
    const map = new Map<string, string>();
    for (const b of bookings) {
      if (b.businessId && !map.has(b.businessId))
        map.set(b.businessId, b.businessName || 'Business');
    }
    return [
      { value: 'all', label: 'All businesses' },
      ...Array.from(map, ([id, name]) => ({ value: id, label: name })),
    ];
  }, [bookings]);

  const metrics = useMemo(() => computeVendorMetrics(bookings), [bookings]);

  const bizFiltered = useMemo(
    () => selectedBizId === 'all' ? bookings : bookings.filter((b) => b.businessId === selectedBizId),
    [bookings, selectedBizId],
  );

  const filtered = useMemo(() => filterBookings(bizFiltered, activeTab), [bizFiltered, activeTab]);

  const sorted = useMemo(
    () => [...filtered].sort((a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime()),
    [filtered],
  );

  const listHeader = !kycVerified ? null : (
    <>
      <View style={s.statsStrip}>
        <View style={s.statItem}>
          <Text style={s.statValue} numberOfLines={1}>{formatINR(metrics.totalRevenue)}</Text>
          <Text style={s.statLabel}>Earned</Text>
        </View>
        <View style={s.statDiv} />
        <View style={s.statItem}>
          <Text style={s.statValue} numberOfLines={1}>{formatINR(metrics.monthRevenue)}</Text>
          <Text style={s.statLabel}>This month</Text>
        </View>
        <View style={s.statDiv} />
        <View style={s.statItem}>
          <Text style={s.statValue} numberOfLines={1}>{String(metrics.paidCount)}</Text>
          <Text style={s.statLabel}>Txns</Text>
        </View>
        <View style={s.statDiv} />
        <View style={s.statItem}>
          <Text style={s.statValue} numberOfLines={1}>{formatINR(metrics.upcomingRevenue)}</Text>
          <Text style={s.statLabel}>Upcoming</Text>
        </View>
      </View>
      <View style={s.dropdownRow}>
        <DropdownPicker
          options={STATUS_OPTIONS}
          value={activeTab}
          onChange={(v) => setActiveTab(v as PayFilter)}
        />
        {bizOptions.length > 1 && (
          <DropdownPicker
            options={bizOptions}
            value={selectedBizId}
            onChange={setSelectedBizId}
          />
        )}
      </View>
    </>
  );

  return (
    <SafeAreaView style={s.screen} edges={['top']}>
      <VendorHeader />

      {!kycVerified ? (
        <KycGate />
      ) : loading ? (
        <View style={s.centered}>
          <ActivityIndicator size="large" color={brand.primary} />
          <Text style={s.loadingText}>Loading payments…</Text>
        </View>
      ) : error ? (
        <View style={s.centered}>
          <View style={s.errorIconWrap}>
            <Ionicons name="cloud-offline-outline" size={40} color={brand.creamMuted} />
          </View>
          <Text style={s.errorTitle}>Something went wrong</Text>
          <Text style={s.errorText}>{error}</Text>
          <Pressable style={s.retryBtn} onPress={() => load()}>
            <Ionicons name="refresh-outline" size={14} color="#fff" />
            <Text style={s.retryBtnText}>Retry</Text>
          </Pressable>
        </View>
      ) : sorted.length === 0 ? (
        <>
          {listHeader}
          <View style={s.centered}>
            <View style={s.emptyIconWrap}>
              <Ionicons name="wallet-outline" size={36} color={brand.primary} />
            </View>
            <Text style={s.emptyTitle}>No transactions</Text>
            <Text style={s.emptySub}>Nothing matches this filter</Text>
          </View>
        </>
      ) : (
        <FlatList
          data={sorted}
          keyExtractor={(b) => b.id}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={listHeader}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={brand.primary} />
          }
          renderItem={({ item }) => <TxRow booking={item} />}
        />
      )}
    </SafeAreaView>
  );
}

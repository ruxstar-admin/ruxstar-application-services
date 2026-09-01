/**
 * Appointments Board — upcoming confirmed bookings for a service business
 * (salon / clinic / coaching).
 *
 * Mirrors web: ServiceAppointmentsBoard component
 * Route: /(vendor)/appointments-board?businessId=<id>&businessName=<name>
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
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { BrandTokens } from '@/hooks/useTheme';
import { useAuthStore } from '@/stores/auth-store';
import {
  listVendorBookings,
  formatTime12,
  fullDateLabel,
  istDayKey,
  type VendorBooking,
} from '@/services/booking-service';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayKey(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
}

function dayHeaderLabel(dateKey: string): string {
  const today = todayKey();
  if (dateKey === today) return 'Today';
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowKey = tomorrow.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  if (dateKey === tomorrowKey) return 'Tomorrow';
  // "Mon, 2 Jun"
  return fullDateLabel(`${dateKey}T09:00:00+05:30`);
}

// ─── Types for FlatList items ─────────────────────────────────────────────────

type ListItem =
  | { type: 'header'; dateKey: string; label: string }
  | { type: 'booking'; booking: VendorBooking };

// ─── Booking Row ──────────────────────────────────────────────────────────────

function BookingRow({ booking }: { booking: VendorBooking }) {
  const { brand } = useTheme();
  const r = useMemo(() => createRStyles(brand), [brand]);
  const timeLabel = booking.startAt
    ? formatTime12(booking.startAt.slice(11, 16))
    : '';
  const endLabel = booking.endAt
    ? ` – ${formatTime12(booking.endAt.slice(11, 16))}`
    : '';
  const serviceInfo =
    booking.serviceLabel || booking.resourceName || 'Appointment';
  const amount = booking.amount ?? booking.pricePerSlot;

  return (
    <View style={r.row}>
      <View style={r.left}>
        <Text style={r.time}>{timeLabel}{endLabel}</Text>
        <Text style={r.service} numberOfLines={1}>{serviceInfo}</Text>
        <Text style={r.customer} numberOfLines={1}>
          {booking.customerName}
          {booking.customerMobile ? ` · ${booking.customerMobile}` : ''}
        </Text>
      </View>
      {amount > 0 ? (
        <Text style={r.amount}>₹{amount.toLocaleString('en-IN')}</Text>
      ) : (
        <Text style={r.free}>Free</Text>
      )}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function AppointmentsBoardScreen() {
  const { brand } = useTheme();
  const s = useMemo(() => createSStyles(brand), [brand]);

  const { businessId, businessName } =
    useLocalSearchParams<{ businessId: string; businessName: string }>();
  const token = useAuthStore((s) => s.token);

  const [bookings,   setBookings]   = useState<VendorBooking[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error,      setError]      = useState('');

  const load = useCallback(async (isRefresh = false) => {
    if (!token || !businessId) return;
    if (isRefresh) setRefreshing(true);
    else           setLoading(true);
    setError('');
    try {
      const all = await listVendorBookings(token, { businessId });
      setBookings(all);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load appointments.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, businessId]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  // Filter: confirmed only, today onwards, sorted asc
  const today = todayKey();

  const upcoming = useMemo(() =>
    bookings
      .filter((b) => b.status === 'confirmed' && istDayKey(b.startAt) >= today)
      .sort((a, b) => a.startAt.localeCompare(b.startAt)),
  [bookings, today]);

  // Group by date → flat list items
  const listItems = useMemo((): ListItem[] => {
    const map = new Map<string, VendorBooking[]>();
    for (const b of upcoming) {
      const key = istDayKey(b.startAt);
      const arr = map.get(key) ?? [];
      arr.push(b);
      map.set(key, arr);
    }
    const items: ListItem[] = [];
    for (const [dateKey, bks] of map.entries()) {
      items.push({ type: 'header', dateKey, label: dayHeaderLabel(dateKey) });
      for (const bk of bks) items.push({ type: 'booking', booking: bk });
    }
    return items;
  }, [upcoming]);

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={s.screen} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <Pressable onPress={() => router.navigate('/(vendor)/businesses' as never)} hitSlop={8} style={s.backBtn}>
          <Ionicons name="chevron-back" size={22} color={brand.cream} />
        </Pressable>
        <View style={s.headerMid}>
          <Text style={s.headerTitle} numberOfLines={1}>{businessName || 'Appointments'}</Text>
          <Text style={s.headerSub}>Upcoming confirmed bookings</Text>
        </View>
        {/* Edit setup — navigate to business-setup to edit staff / services / hours */}
        <Pressable
          hitSlop={8}
          style={s.refreshBtn}
          onPress={() => router.push({ pathname: '/(vendor)/business-setup', params: { id: businessId, edit: '1' } } as never)}
        >
          <Ionicons name="create-outline" size={18} color={brand.primary} />
        </Pressable>
        <Pressable onPress={() => load(true)} hitSlop={8} style={s.refreshBtn} disabled={loading || refreshing}>
          {refreshing
            ? <ActivityIndicator size="small" color={brand.primary} />
            : <Ionicons name="refresh-outline" size={18} color={brand.cream} />}
        </Pressable>
      </View>

      {/* Stats bar */}
      {!loading && !error && (
        <View style={s.statsBar}>
          <Ionicons name="people-outline" size={14} color={brand.primary} />
          <Text style={s.statsText}>
            <Text style={s.statsNum}>{upcoming.length}</Text>
            {' '}upcoming · confirmed &amp; paid only
          </Text>
        </View>
      )}

      {/* Body */}
      {loading && !refreshing ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={brand.primary} />
          <Text style={s.loadingText}>Loading appointments…</Text>
        </View>
      ) : error ? (
        <View style={s.center}>
          <Ionicons name="cloud-offline-outline" size={36} color={brand.creamMuted} />
          <Text style={s.errorText}>{error}</Text>
          <Pressable style={s.retryBtn} onPress={() => load()}>
            <Ionicons name="refresh-outline" size={14} color="#fff" />
            <Text style={s.retryBtnText}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={listItems}
          keyExtractor={(item, i) =>
            item.type === 'header' ? `hdr-${item.dateKey}` : `bk-${item.booking.id}-${i}`
          }
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => load(true)}
              tintColor={brand.primary}
            />
          }
          ListEmptyComponent={
            <View style={s.empty}>
              <View style={s.emptyIcon}>
                <Ionicons name="calendar-outline" size={32} color={brand.creamMuted} />
              </View>
              <Text style={s.emptyTitle}>No upcoming appointments</Text>
              <Text style={s.emptySub}>
                Confirmed bookings will appear here once customers book and pay.
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            if (item.type === 'header') {
              return (
                <View style={s.dayHeader}>
                  <Text style={s.dayHeaderText}>{item.label}</Text>
                </View>
              );
            }
            return <BookingRow booking={item.booking} />;
          }}
        />
      )}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const createRStyles = (brand: BrandTokens) => StyleSheet.create({
  row: {
    flexDirection:    'row',
    alignItems:       'center',
    backgroundColor:  brand.surface1,
    borderRadius:     Radius.lg,
    borderWidth:      1,
    borderColor:      brand.border1,
    paddingHorizontal: Spacing.three,
    paddingVertical:  Spacing.two + 2,
    marginBottom:     Spacing.one + 2,
    gap:              Spacing.two,
  },
  left:     { flex: 1, gap: 2 },
  time:     { fontSize: 14, fontWeight: '700', color: brand.cream },
  service:  { fontSize: 12, color: brand.creamSub },
  customer: { fontSize: 11, color: brand.creamMuted },
  amount:   { fontSize: 14, fontWeight: '700', color: brand.success },
  free:     { fontSize: 13, fontWeight: '600', color: brand.creamMuted },
});

const createSStyles = (brand: BrandTokens) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: brand.bg },

  header: {
    flexDirection:    'row',
    alignItems:       'center',
    paddingHorizontal: Spacing.three,
    paddingVertical:  Spacing.two + 2,
    borderBottomWidth: 1,
    borderBottomColor: brand.border1,
    gap:              Spacing.two,
  },
  backBtn:    { width: 36, height: 36, borderRadius: Radius.md, backgroundColor: brand.surface1, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: brand.border1 },
  headerMid:  { flex: 1 },
  headerTitle:{ fontSize: 16, fontWeight: '700', color: brand.cream },
  headerSub:  { fontSize: 11, color: brand.creamMuted, marginTop: 1 },
  refreshBtn: { width: 36, height: 36, borderRadius: Radius.md, backgroundColor: brand.surface1, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: brand.border1 },

  statsBar: {
    flexDirection:    'row',
    alignItems:       'center',
    gap:              6,
    paddingHorizontal: Spacing.four,
    paddingVertical:  Spacing.two,
    borderBottomWidth: 1,
    borderBottomColor: brand.border1,
    backgroundColor:  brand.surface1,
  },
  statsText: { fontSize: 12, color: brand.creamMuted },
  statsNum:  { fontWeight: '700', color: brand.cream },

  listContent: { padding: Spacing.four, paddingBottom: 60 },

  dayHeader:     { marginTop: Spacing.three, marginBottom: Spacing.two },
  dayHeaderText: { fontSize: 11, fontWeight: '700', color: brand.primary, textTransform: 'uppercase', letterSpacing: 0.6 },

  center:      { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.two, padding: Spacing.four },
  loadingText: { fontSize: 13, color: brand.creamMuted },
  errorText:   { fontSize: 13, color: brand.creamSub, textAlign: 'center' },
  retryBtn:    { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: brand.primary, borderRadius: Radius.pill, paddingHorizontal: Spacing.four, paddingVertical: 10, marginTop: Spacing.one },
  retryBtnText:{ color: '#fff', fontWeight: '700', fontSize: 13 },

  empty:      { alignItems: 'center', paddingTop: Spacing.six, gap: Spacing.two },
  emptyIcon:  { width: 72, height: 72, borderRadius: Radius.xl, backgroundColor: brand.surface1, borderWidth: 1, borderColor: brand.border1, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.two },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: brand.cream },
  emptySub:   { fontSize: 13, color: brand.creamSub, textAlign: 'center', lineHeight: 19, paddingHorizontal: Spacing.four },
});

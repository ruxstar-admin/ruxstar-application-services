/**
 * Vendor Orders Screen
 * Stats row → two dropdowns (Status + Business) → day-grouped booking list
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Linking,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useAuthStore } from '@/stores/auth-store';
import {
  listVendorBookings,
  getPublicBusiness,
  istDayKey,
  formatTime12,
  dayParts,
  fullDateLabel,
  type VendorBooking,
} from '@/services/booking-service';
import { Radius, Spacing } from '@/constants/theme';
import VendorHeader from '@/components/vendor/VendorHeader';
import DropdownPicker, { type DropdownOption } from '@/components/ui/DropdownPicker';
import { useTheme } from '@/hooks/useTheme';
import type { BrandTokens } from '@/hooks/useTheme';

// ─── Types & constants ────────────────────────────────────────────────────────

type Tab = 'upcoming' | 'today' | 'past' | 'cancelled' | 'all';

const STATUS_OPTIONS: DropdownOption[] = [
  { value: 'upcoming',  label: 'Upcoming'  },
  { value: 'today',     label: 'Today'     },
  { value: 'past',      label: 'Past'      },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'all',       label: 'All orders'},
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function filterByTab(bookings: VendorBooking[], tab: Tab): VendorBooking[] {
  const now      = Date.now();
  const todayKey = istDayKey(new Date().toISOString());
  switch (tab) {
    // Match web: confirmed = paid/active; cancelled excluded from active tabs
    case 'upcoming':  return bookings.filter((b) => b.status === 'confirmed' && new Date(b.startAt).getTime() > now);
    case 'today':     return bookings.filter((b) => b.status === 'confirmed' && istDayKey(b.startAt) === todayKey);
    case 'past':      return bookings.filter((b) => b.status === 'confirmed' && new Date(b.startAt).getTime() <= now);
    case 'cancelled': return bookings.filter((b) => b.status === 'cancelled');
    default:          return bookings;
  }
}

interface DayGroup { key: string; label: string; bookings: VendorBooking[] }

function groupByDay(bookings: VendorBooking[], dir: 'asc' | 'desc' = 'desc'): DayGroup[] {
  const map = new Map<string, VendorBooking[]>();
  for (const b of bookings) {
    const k = istDayKey(b.startAt);
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(b);
  }
  return Array.from(map.entries())
    // asc = soonest-day first (upcoming/today); desc = latest-day first (past/all)
    .sort(([a], [b]) => dir === 'asc' ? a.localeCompare(b) : b.localeCompare(a))
    .map(([key, list]) => ({
      key,
      label:    fullDateLabel(list[0].startAt),
      bookings: list.sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()),
    }));
}

// ─── Style factory ────────────────────────────────────────────────────────────

const createStyles = (brand: BrandTokens) => StyleSheet.create({
  screen:   { flex: 1, backgroundColor: brand.bg },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.four, gap: Spacing.two },

  statsRow: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: Spacing.four, marginTop: Spacing.three, marginBottom: Spacing.two,
    backgroundColor: brand.surface1, borderRadius: Radius.lg,
    paddingVertical: Spacing.three, paddingHorizontal: Spacing.two,
    borderWidth: 1, borderColor: brand.border1,
  },
  statPill:    { flex: 1, alignItems: 'center', gap: 4 },
  statIconWrap:{ width: 32, height: 32, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center' },
  statValue:   { fontSize: 17, fontWeight: '700', color: brand.cream },
  statLabel:   { fontSize: 10, color: brand.creamSub, fontWeight: '500', letterSpacing: 0.2 },
  statDivider: { width: 1, height: 36, backgroundColor: brand.border1 },

  /* Dropdowns */
  dropdownRow: {
    flexDirection: 'row', gap: Spacing.two,
    paddingHorizontal: Spacing.four, paddingVertical: Spacing.two,
    borderBottomWidth: 1, borderBottomColor: brand.border1,
  },

  /* List */
  listContent:   { paddingHorizontal: Spacing.four, paddingBottom: Spacing.six, paddingTop: Spacing.two },
  dayHeaderRow:  { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, marginTop: Spacing.three, marginBottom: Spacing.two },
  dayHeaderLine: { flex: 1, height: 1, backgroundColor: brand.border1 },
  dayHeader:     { fontSize: 11, fontWeight: '600', color: brand.creamMuted, textTransform: 'uppercase', letterSpacing: 0.8 },

  /* Order card */
  orderCard: {
    flexDirection: 'row', alignItems: 'stretch',
    backgroundColor: brand.surface1, borderRadius: Radius.md, marginBottom: Spacing.two,
    borderWidth: 1, borderColor: brand.border1, overflow: 'hidden',
  },
  orderCardCancelled: { opacity: 0.55 },
  statusBar:          { width: 3 },
  statusBarDefault:   { backgroundColor: brand.primary },
  statusBarPaid:      { backgroundColor: brand.success },
  statusBarCancelled: { backgroundColor: brand.error },

  dateCube:    { alignItems: 'center', justifyContent: 'center', width: 50, paddingVertical: Spacing.three, paddingLeft: Spacing.two },
  cubeWeekday: { fontSize: 9, color: brand.creamMuted, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: '600' },
  cubeDay:     { fontSize: 22, fontWeight: '800', color: brand.cream, lineHeight: 26 },
  cubeMonth:   { fontSize: 10, color: brand.creamSub, fontWeight: '500' },
  cardDivider: { width: 1, backgroundColor: brand.border1 },

  orderInfo:    { flex: 1, paddingHorizontal: Spacing.two + 2, paddingVertical: Spacing.two + 2, gap: 4, justifyContent: 'center' },
  infoTop:      { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  infoTopLeft:  { flex: 1 },
  infoTopRight: { alignItems: 'flex-end', gap: 3 },
  customerName: { fontSize: 14, fontWeight: '700', color: brand.cream },
  metaRow:      { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText:     { fontSize: 11, color: brand.creamSub },
  metaDot:      { fontSize: 11, color: brand.creamMuted },
  bizName:      { fontSize: 11, color: brand.primary, fontWeight: '600' },

  phoneChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start',
    backgroundColor: brand.primaryGlow, borderRadius: Radius.pill,
    paddingHorizontal: Spacing.two, paddingVertical: 3, marginTop: 2,
  },
  phoneChipText: { fontSize: 11, color: brand.primary, fontWeight: '600' },

  cancelBadge:     { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(220,38,38,0.08)', borderRadius: Radius.pill, paddingHorizontal: Spacing.one + 2, paddingVertical: 2 },
  cancelBadgeText: { fontSize: 10, fontWeight: '700', color: brand.error },
  paidBadge:       { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(22,163,74,0.10)', borderRadius: Radius.pill, paddingHorizontal: Spacing.one + 2, paddingVertical: 2 },
  paidBadgeText:   { fontSize: 10, fontWeight: '700', color: brand.success },

  amount: { fontSize: 14, fontWeight: '800', color: brand.cream },
  muted:  { color: brand.creamMuted },

  emptyIconWrap: { width: 72, height: 72, borderRadius: Radius.xl, backgroundColor: brand.primaryGlow, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.two },
  emptyTitle:    { fontSize: 17, fontWeight: '700', color: brand.cream },
  emptySub:      { fontSize: 13, color: brand.creamSub },

  errorIconWrap: { width: 72, height: 72, borderRadius: Radius.xl, backgroundColor: brand.surface1, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.two },
  errorTitle:    { fontSize: 16, fontWeight: '700', color: brand.cream },
  errorText:     { fontSize: 13, color: brand.creamSub, textAlign: 'center' },
  retryBtn:      { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: brand.primary, borderRadius: Radius.pill, paddingHorizontal: Spacing.four, paddingVertical: Spacing.two, marginTop: Spacing.one },
  retryBtnText:  { color: '#fff', fontWeight: '700', fontSize: 13 },
  loadingText:   { fontSize: 13, color: brand.creamSub, marginTop: 4 },

  orderCardPressed: { opacity: 0.75 },

  /* Modal */
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.55)' },
  modalSheet: {
    backgroundColor: brand.bg, borderTopLeftRadius: Radius.xxl, borderTopRightRadius: Radius.xxl,
    overflow: 'hidden', maxHeight: '88%',
  },
  modalCoverWrap: { position: 'relative' },
  modalCover: { width: '100%', height: 200, backgroundColor: brand.surface1 },
  modalCoverPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  modalStatusStrip: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 3 },
  modalClose: {
    position: 'absolute', top: Spacing.three, right: Spacing.three,
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center',
  },
  modalBody: { flexGrow: 0 },
  modalBodyContent: { padding: Spacing.four, gap: Spacing.three },
  modalBizRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  modalBizName: { fontSize: 18, fontWeight: '700', color: brand.cream, flex: 1 },
  modalSection: { gap: Spacing.two + 2, backgroundColor: brand.surface1, borderRadius: Radius.lg, padding: Spacing.three, borderWidth: 1, borderColor: brand.border1 },
  modalDetailRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two },
  modalDetailIcon: { width: 28, height: 28, borderRadius: Radius.sm, backgroundColor: brand.primaryGlow, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  modalDetailText: { flex: 1 },
  modalDetailLabel: { fontSize: 10, fontWeight: '600', color: brand.creamMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 1 },
  modalDetailValue: { fontSize: 14, fontWeight: '600', color: brand.cream },
  modalAmount: { fontSize: 18, fontWeight: '800', color: brand.cream },
  modalCallBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.two,
    backgroundColor: brand.primary, borderRadius: Radius.pill,
    paddingVertical: Spacing.three, marginBottom: Spacing.four,
  },
  modalCallBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatPill({ label, value, icon, color }: {
  label: string; value: string;
  icon: keyof typeof Ionicons.glyphMap; color: string;
}) {
  const { brand } = useTheme();
  const s = useMemo(() => createStyles(brand), [brand]);
  return (
    <View style={s.statPill}>
      <View style={[s.statIconWrap, { backgroundColor: `${color}18` }]}>
        <Ionicons name={icon} size={16} color={color} />
      </View>
      <Text style={s.statValue}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

function OrderDetailModal({ booking, onClose }: { booking: VendorBooking; onClose: () => void }) {
  const { brand } = useTheme();
  const s = useMemo(() => createStyles(brand), [brand]);

  const { weekday, day, month } = dayParts(booking.startAt);
  const isCancelled = booking.status === 'cancelled';
  const isPaid      = booking.paymentStatus === 'paid';
  const amount      = booking.amount ?? booking.pricePerSlot;
  const [coverUrl, setCoverUrl] = useState<string | null>(booking.coverUrl ?? null);
  const [imgLoading, setImgLoading] = useState(!booking.coverUrl && !!booking.businessId);

  useEffect(() => {
    if (booking.coverUrl || !booking.businessId) return;
    getPublicBusiness(booking.businessId)
      .then((biz) => { if (biz.coverUrl) setCoverUrl(biz.coverUrl); })
      .catch(() => {})
      .finally(() => setImgLoading(false));
  }, [booking.businessId, booking.coverUrl]);

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View style={s.modalOverlay}>
        <View style={s.modalSheet}>
          {/* Cover image */}
          <View style={s.modalCoverWrap}>
            {coverUrl ? (
              <Image source={{ uri: coverUrl }} style={s.modalCover} resizeMode="cover" />
            ) : imgLoading ? (
              <View style={[s.modalCover, s.modalCoverPlaceholder]}>
                <ActivityIndicator color={brand.primary} />
              </View>
            ) : (
              <View style={[s.modalCover, s.modalCoverPlaceholder]}>
                <Ionicons name="business-outline" size={40} color={brand.creamMuted} />
              </View>
            )}
            <Pressable style={s.modalClose} onPress={onClose} hitSlop={12}>
              <Ionicons name="close" size={18} color={brand.cream} />
            </Pressable>
            {/* Status strip over image */}
            <View style={[s.modalStatusStrip,
              isCancelled ? s.statusBarCancelled : isPaid ? s.statusBarPaid : s.statusBarDefault]} />
          </View>

          <ScrollView style={s.modalBody} contentContainerStyle={s.modalBodyContent} showsVerticalScrollIndicator={false}>
            {/* Business name + badge */}
            <View style={s.modalBizRow}>
              <Text style={s.modalBizName} numberOfLines={1}>{booking.businessName}</Text>
              {isCancelled ? (
                <View style={s.cancelBadge}>
                  <Ionicons name="close-circle" size={10} color={brand.error} />
                  <Text style={s.cancelBadgeText}>Cancelled</Text>
                </View>
              ) : isPaid ? (
                <View style={s.paidBadge}>
                  <Ionicons name="checkmark-circle" size={10} color={brand.success} />
                  <Text style={s.paidBadgeText}>Paid</Text>
                </View>
              ) : null}
            </View>

            {/* Customer */}
            <View style={s.modalSection}>
              <View style={s.modalDetailRow}>
                <View style={s.modalDetailIcon}><Ionicons name="person-outline" size={14} color={brand.primary} /></View>
                <View style={s.modalDetailText}>
                  <Text style={s.modalDetailLabel}>Customer</Text>
                  <Text style={s.modalDetailValue}>{booking.customerName || 'Customer'}</Text>
                </View>
              </View>

              {/* Date & time */}
              <View style={s.modalDetailRow}>
                <View style={s.modalDetailIcon}><Ionicons name="calendar-outline" size={14} color={brand.primary} /></View>
                <View style={s.modalDetailText}>
                  <Text style={s.modalDetailLabel}>Date</Text>
                  <Text style={s.modalDetailValue}>{weekday}, {day} {month}</Text>
                </View>
              </View>

              <View style={s.modalDetailRow}>
                <View style={s.modalDetailIcon}><Ionicons name="time-outline" size={14} color={brand.primary} /></View>
                <View style={s.modalDetailText}>
                  <Text style={s.modalDetailLabel}>Time</Text>
                  <Text style={s.modalDetailValue}>{formatTime12(booking.startAt)} – {formatTime12(booking.endAt)}</Text>
                </View>
              </View>

              {/* Resource / service */}
              <View style={s.modalDetailRow}>
                <View style={s.modalDetailIcon}><Ionicons name="layers-outline" size={14} color={brand.primary} /></View>
                <View style={s.modalDetailText}>
                  <Text style={s.modalDetailLabel}>{booking.serviceLabel ? 'Service' : 'Resource'}</Text>
                  <Text style={s.modalDetailValue}>{booking.serviceLabel || booking.resourceName}</Text>
                </View>
              </View>

              {/* Amount */}
              {amount > 0 && (
                <View style={s.modalDetailRow}>
                  <View style={s.modalDetailIcon}><Ionicons name="cash-outline" size={14} color={brand.primary} /></View>
                  <View style={s.modalDetailText}>
                    <Text style={s.modalDetailLabel}>Amount</Text>
                    <Text style={[s.modalDetailValue, s.modalAmount]}>₹{amount.toLocaleString('en-IN')}</Text>
                  </View>
                </View>
              )}
            </View>

            {/* Call button */}
            {booking.customerMobile ? (
              <Pressable
                style={s.modalCallBtn}
                onPress={() => Linking.openURL(`tel:${booking.customerMobile}`)}
              >
                <Ionicons name="call-outline" size={16} color="#fff" />
                <Text style={s.modalCallBtnText}>Call {booking.customerMobile}</Text>
              </Pressable>
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function OrderRow({ booking, onPress }: { booking: VendorBooking; onPress: () => void }) {
  const { brand } = useTheme();
  const s = useMemo(() => createStyles(brand), [brand]);

  const { weekday, day, month } = dayParts(booking.startAt);
  const isCancelled = booking.status === 'cancelled';
  const isPaid      = booking.paymentStatus === 'paid';
  const amount      = booking.amount ?? booking.pricePerSlot;

  return (
    <Pressable
      style={({ pressed }) => [s.orderCard, isCancelled && s.orderCardCancelled, pressed && s.orderCardPressed]}
      onPress={onPress}
    >
      <View style={[s.statusBar,
        isCancelled ? s.statusBarCancelled : isPaid ? s.statusBarPaid : s.statusBarDefault]} />

      <View style={s.dateCube}>
        <Text style={s.cubeWeekday}>{weekday}</Text>
        <Text style={s.cubeDay}>{day}</Text>
        <Text style={s.cubeMonth}>{month}</Text>
      </View>

      <View style={s.cardDivider} />

      <View style={s.orderInfo}>
        {/* Top row: name (left) + amount & badge (right) */}
        <View style={s.infoTop}>
          <View style={s.infoTopLeft}>
            <Text style={[s.customerName, isCancelled && s.muted]} numberOfLines={1}>
              {booking.customerName || 'Customer'}
            </Text>
          </View>
          <View style={s.infoTopRight}>
            {amount > 0 && (
              <Text style={[s.amount, isCancelled && s.muted]}>
                ₹{amount.toLocaleString('en-IN')}
              </Text>
            )}
            {isCancelled ? (
              <View style={s.cancelBadge}>
                <Ionicons name="close-circle" size={10} color={brand.error} />
                <Text style={s.cancelBadgeText}>Cancelled</Text>
              </View>
            ) : isPaid ? (
              <View style={s.paidBadge}>
                <Ionicons name="checkmark-circle" size={10} color={brand.success} />
                <Text style={s.paidBadgeText}>Paid</Text>
              </View>
            ) : null}
          </View>
        </View>

        <View style={s.metaRow}>
          <Ionicons name="time-outline" size={11} color={brand.creamMuted} />
          <Text style={s.metaText} numberOfLines={1}>
            {formatTime12(booking.startAt)} – {formatTime12(booking.endAt)}
          </Text>
          <Text style={s.metaDot}>·</Text>
          <Text style={s.metaText} numberOfLines={1}>{booking.resourceName}</Text>
        </View>

        <View style={s.metaRow}>
          <Ionicons name="business-outline" size={11} color={brand.primary} />
          <Text style={s.bizName} numberOfLines={1}>{booking.businessName}</Text>
        </View>

        {booking.customerMobile ? (
          <Pressable
            style={s.phoneChip}
            onPress={(e) => { e.stopPropagation(); Linking.openURL(`tel:${booking.customerMobile}`); }}
          >
            <Ionicons name="call-outline" size={11} color={brand.primary} />
            <Text style={s.phoneChipText}>{booking.customerMobile}</Text>
          </Pressable>
        ) : null}
      </View>
    </Pressable>
  );
}

type ListItem =
  | { type: 'group-header'; key: string; label: string }
  | { type: 'booking';      key: string; booking: VendorBooking };

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function VendorOrdersScreen() {
  const token = useAuthStore((s) => s.token);

  const { brand } = useTheme();
  const s = useMemo(() => createStyles(brand), [brand]);

  const [bookings,         setBookings]         = useState<VendorBooking[]>([]);
  const [loading,          setLoading]          = useState(true);
  const [refreshing,       setRefreshing]       = useState(false);
  const [error,            setError]            = useState<string | null>(null);
  const [activeTab,        setActiveTab]        = useState<Tab>('upcoming');
  const [selectedBizId,    setSelectedBizId]    = useState<string>('all');
  const [selectedBooking,  setSelectedBooking]  = useState<VendorBooking | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (!token) return;
    try {
      isRefresh ? setRefreshing(true) : setLoading(true);
      setError(null);
      setBookings(await listVendorBookings(token));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load orders');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  // Build business dropdown options
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

  const bizFiltered = useMemo(
    () => selectedBizId === 'all' ? bookings : bookings.filter((b) => b.businessId === selectedBizId),
    [bookings, selectedBizId],
  );

  const filtered  = useMemo(() => filterByTab(bizFiltered, activeTab), [bizFiltered, activeTab]);
  // upcoming + today: soonest first (asc) — matches web. past + all + cancelled: newest first (desc).
  const sortDir   = (activeTab === 'upcoming' || activeTab === 'today') ? 'asc' : 'desc';
  const groups    = useMemo(() => groupByDay(filtered, sortDir), [filtered, sortDir]);

  const listData = useMemo<ListItem[]>(() => {
    const items: ListItem[] = [];
    for (const g of groups) {
      items.push({ type: 'group-header', key: `hdr-${g.key}`, label: g.label });
      for (const b of g.bookings)
        items.push({ type: 'booking', key: b.id, booking: b });
    }
    return items;
  }, [groups]);

  const confirmed = bookings.filter((b) => b.status !== 'cancelled').length;
  const upcoming  = bookings.filter((b) => b.status !== 'cancelled' && new Date(b.startAt).getTime() > Date.now()).length;
  const revenue   = bookings.filter((b) => b.status !== 'cancelled').reduce((sum, b) => sum + (b.amount ?? b.pricePerSlot), 0);

  return (
    <SafeAreaView style={s.screen} edges={['top']}>
      <VendorHeader />

      {/* Stats */}
      <View style={s.statsRow}>
        <StatPill label="Confirmed" value={String(confirmed)} icon="checkmark-circle-outline" color={brand.success} />
        <View style={s.statDivider} />
        <StatPill label="Upcoming"  value={String(upcoming)}  icon="time-outline"             color={brand.primary} />
        <View style={s.statDivider} />
        <StatPill label="Revenue"   value={`₹${revenue.toLocaleString('en-IN')}`} icon="cash-outline" color="#D97706" />
      </View>

      {/* ── Dropdowns ── */}
      <View style={s.dropdownRow}>
        <DropdownPicker
          options={STATUS_OPTIONS}
          value={activeTab}
          onChange={(v) => setActiveTab(v as Tab)}
        />
        {bizOptions.length > 1 && (
          <DropdownPicker
            options={bizOptions}
            value={selectedBizId}
            onChange={setSelectedBizId}
          />
        )}
      </View>

      {/* Content */}
      {loading ? (
        <View style={s.centered}>
          <ActivityIndicator size="large" color={brand.primary} />
          <Text style={s.loadingText}>Loading orders…</Text>
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
      ) : listData.length === 0 ? (
        <View style={s.centered}>
          <View style={s.emptyIconWrap}>
            <Ionicons name="receipt-outline" size={36} color={brand.primary} />
          </View>
          <Text style={s.emptyTitle}>No orders</Text>
          <Text style={s.emptySub}>Nothing matches this filter</Text>
        </View>
      ) : (
        <FlatList
          data={listData}
          keyExtractor={(item) => item.key}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={brand.primary} />
          }
          renderItem={({ item }) => {
            if (item.type === 'group-header') {
              return (
                <View style={s.dayHeaderRow}>
                  <View style={s.dayHeaderLine} />
                  <Text style={s.dayHeader}>{item.label}</Text>
                  <View style={s.dayHeaderLine} />
                </View>
              );
            }
            return <OrderRow booking={item.booking} onPress={() => setSelectedBooking(item.booking)} />;
          }}
        />
      )}

      {selectedBooking && (
        <OrderDetailModal booking={selectedBooking} onClose={() => setSelectedBooking(null)} />
      )}
    </SafeAreaView>
  );
}

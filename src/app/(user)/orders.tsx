/**
 * Customer Bookings Screen
 * Tabs: All | Upcoming | Events | Past
 * Fully theme-aware — uses useTheme() throughout
 */

import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { useAuthStore } from '@/stores/auth-store';
import {
  listCustomerBookings,
  listMyEventRegistrations,
  cancelCustomerBooking,
  requestBookingRefund,
  formatTime12,
  dayParts,
  fullDateLabel,
  type CustomerBooking,
  type CustomerEventRegistration,
} from '@/services/booking-service';
import { listMyPrintOrders } from '@/services/print-service';
import type { PrintOrder } from '@/types/print';
import { listMyCommerceOrders, type CommerceOrder } from '@/services/commerce-service';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { StatusBadge } from '@/components/atoms';

// ─── Filter definitions ────────────────────────────────────────────────────────

type TabKey = 'all' | 'upcoming' | 'events' | 'commerce' | 'past';

const TAB_OPTS = [
  { value: 'all',      label: 'All Bookings', icon: 'list-outline'      },
  { value: 'upcoming', label: 'Upcoming',      icon: 'calendar-outline'  },
  { value: 'events',   label: 'Events',        icon: 'trophy-outline'    },
  { value: 'commerce', label: 'Shop Orders',   icon: 'bag-outline'       },
  { value: 'past',     label: 'Past',          icon: 'time-outline'      },
] as const;

// ─── Status helpers ───────────────────────────────────────────────────────────

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    confirmed:       'Confirmed',
    cancelled:       'Cancelled',
    completed:       'Completed',
    pending_payment: 'Pending payment',
    expired:         'Expired',
    upcoming:        'Upcoming',
    pending:         'Pending',
    in_progress:     'In progress',
    rejected:        'Rejected',
    refunded:        'Refunded',
  };
  return map[status] ?? status;
}

function printStatusLabel(status: string): string {
  const map: Record<string, string> = {
    open:            'Awaiting vendor',
    accepted:        'Awaiting payment',
    pending_payment: 'Payment processing',
    confirmed:       'Confirmed',
    in_production:   'In production',
    ready:           'Ready',
    completed:       'Completed',
    cancelled:       'Cancelled',
    expired:         'Expired',
  };
  return map[status] ?? status;
}

const CAT_EMOJI: Record<string, string> = {
  tshirts: '👕', hoodies: '🧥', jerseys: '⚽', business_cards: '💼',
  posters: '🖼️', flex_banners: '🏳️', stickers: '⭐', invitations: '💌',
  photo_prints: '📷', documents: '📄',
};

// ─── Booking Card ─────────────────────────────────────────────────────────────

function BookingCard({
  booking,
  onCancel,
  cancelling,
  onRefund,
  refunding,
}: {
  booking:    CustomerBooking;
  onCancel:   (id: string) => void;
  cancelling: boolean;
  onRefund:   (id: string) => void;
  refunding:  boolean;
}) {
  const { brand } = useTheme();
  const { weekday, day, month } = dayParts(booking.startAt);
  const isCancelled      = booking.status === 'cancelled';
  const isRefunded       = booking.status === 'refunded';
  const isConfirmed      = booking.status === 'confirmed';
  const isPendingPayment = booking.status === 'pending_payment';
  const isUpcoming       = !isCancelled && new Date(booking.startAt).getTime() > Date.now();
  const amount           = booking.amount ?? booking.pricePerSlot;
  const isPaid           = booking.paymentStatus === 'paid';
  const canRefund        = isCancelled && isPaid && !isRefunded;

  const handleCancel = () => {
    Alert.alert(
      'Cancel Booking',
      `Cancel your booking at ${booking.businessName}?`,
      [
        { text: 'No',  style: 'cancel' },
        { text: 'Yes, cancel', style: 'destructive', onPress: () => onCancel(booking.id) },
      ],
    );
  };

  return (
    <View
      style={[
        card.wrap,
        {
          backgroundColor: brand.surface1,
          borderColor: brand.border1,
          opacity: isCancelled ? 0.65 : 1,
        },
      ]}
    >
      {/* Date cube */}
      <View style={card.dateCube}>
        <Text style={[card.weekday, { color: brand.creamSub }]}>{weekday}</Text>
        <Text style={[card.day, { color: brand.cream }]}>{day}</Text>
        <Text style={[card.month, { color: brand.creamSub }]}>{month}</Text>
      </View>

      {/* Main info */}
      <View style={card.info}>
        <Text style={[card.name, { color: brand.cream }]} numberOfLines={1}>
          {booking.businessName}
        </Text>
        <Text style={[card.meta, { color: brand.creamSub }]} numberOfLines={1}>
          {formatTime12(booking.startAt)} – {formatTime12(booking.endAt)}
        </Text>
        {booking.resourceName ? (
          <Text style={[card.meta, { color: brand.creamSub }]} numberOfLines={1}>
            {booking.resourceName}
          </Text>
        ) : null}
        <Text style={[card.meta, { color: brand.creamMuted }]}>{fullDateLabel(booking.startAt)}</Text>

        <View style={card.badgeRow}>
          <StatusBadge status={booking.status} label={statusLabel(booking.status)} size="sm" />
          {isPaid && !isCancelled && (
            <View style={[card.paidBadge, { backgroundColor: '#DCFCE7' }]}>
              <Text style={[card.paidText, { color: brand.success }]}>Paid</Text>
            </View>
          )}
        </View>

        {isUpcoming && isConfirmed && (
          <Pressable
            style={[card.cancelBtn, { borderColor: brand.error }, cancelling && card.disabledBtn]}
            onPress={handleCancel}
            disabled={cancelling}
          >
            {cancelling ? (
              <ActivityIndicator size="small" color={brand.error} />
            ) : (
              <Text style={[card.cancelText, { color: brand.error }]}>Cancel booking</Text>
            )}
          </Pressable>
        )}

        {isUpcoming && isPendingPayment && (
          <View style={[card.noticeBadge, { backgroundColor: `${brand.warning}18`, borderColor: `${brand.warning}40` }]}>
            <Ionicons name="time-outline" size={12} color={brand.warning} />
            <Text style={[card.noticeText, { color: brand.warning }]}>Payment still in process</Text>
          </View>
        )}

        {canRefund && (
          <Pressable
            style={[card.refundBtn, { borderColor: '#3B82F6' }, refunding && card.disabledBtn]}
            onPress={() => onRefund(booking.id)}
            disabled={refunding}
          >
            {refunding ? (
              <ActivityIndicator size="small" color="#3B82F6" />
            ) : (
              <>
                <Ionicons name="return-down-back-outline" size={12} color="#3B82F6" />
                <Text style={card.refundText}>Request Refund</Text>
              </>
            )}
          </Pressable>
        )}
      </View>

      {/* Amount */}
      {amount > 0 ? (
        <View style={card.amountCol}>
          <Text style={[card.amount, { color: brand.cream }]}>
            ₹{amount.toLocaleString('en-IN')}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const card = StyleSheet.create({
  wrap:       { flexDirection: 'row', borderRadius: Radius.md, padding: Spacing.three, marginBottom: Spacing.two, gap: Spacing.three, borderWidth: 1 },
  dateCube:   { alignItems: 'center', width: 44, paddingTop: 2 },
  weekday:    { fontSize: 10, textTransform: 'uppercase' },
  day:        { fontSize: 22, fontWeight: '700', lineHeight: 26 },
  month:      { fontSize: 11 },
  info:       { flex: 1, gap: 3 },
  name:       { fontSize: 15, fontWeight: '700' },
  meta:       { fontSize: 12 },
  badgeRow:   { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  paidBadge:  { borderRadius: Radius.pill, paddingHorizontal: 8, paddingVertical: 2 },
  paidText:   { fontSize: 10, fontWeight: '700' },
  cancelBtn:  { alignSelf: 'flex-start', marginTop: Spacing.two, borderWidth: 1, borderRadius: Radius.pill, paddingHorizontal: Spacing.three, paddingVertical: 5 },
  disabledBtn:{ opacity: 0.5 },
  cancelText: { fontSize: 12, fontWeight: '600' },
  refundBtn:  { alignSelf: 'flex-start', marginTop: Spacing.two, borderWidth: 1, borderRadius: Radius.pill, paddingHorizontal: Spacing.three, paddingVertical: 5, flexDirection: 'row', alignItems: 'center', gap: 4 },
  refundText: { fontSize: 12, fontWeight: '600', color: '#3B82F6' },
  noticeBadge:{ flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 4, marginTop: Spacing.two, borderRadius: Radius.pill, paddingHorizontal: Spacing.three, paddingVertical: 5, borderWidth: 1 },
  noticeText: { fontSize: 12, fontWeight: '600' },
  amountCol:  { alignItems: 'flex-end', justifyContent: 'flex-start', paddingTop: 2 },
  amount:     { fontSize: 15, fontWeight: '700' },
});

// ─── Event Registration Card ──────────────────────────────────────────────────

function EventCard({ reg }: { reg: CustomerEventRegistration }) {
  const { brand } = useTheme();
  const emoji     = reg.kind === 'tournament' ? '🏆' : '🎉';
  const isFree    = reg.amount === 0;
  const dateLabel = reg.startAt
    ? new Date(reg.startAt).toLocaleDateString('en-IN', {
        day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata',
      })
    : '';

  return (
    <View style={[card.wrap, { backgroundColor: brand.surface1, borderColor: brand.border1 }]}>
      <View style={[ev.emojiCircle, { backgroundColor: brand.primaryGlow }]}>
        <Text style={ev.emoji}>{emoji}</Text>
      </View>

      <View style={card.info}>
        <Text style={[card.name, { color: brand.cream }]} numberOfLines={1}>{reg.eventTitle}</Text>
        {reg.format === 'team' && reg.teamName ? (
          <Text style={[card.meta, { color: brand.creamSub }]} numberOfLines={1}>Team: {reg.teamName}</Text>
        ) : null}
        {dateLabel ? <Text style={[card.meta, { color: brand.creamMuted }]}>{dateLabel}</Text> : null}
        {reg.venue ? <Text style={[card.meta, { color: brand.creamSub }]} numberOfLines={1}>{reg.venue}</Text> : null}
        <View style={{ marginTop: 4 }}>
          <StatusBadge status={reg.status} label={statusLabel(reg.status)} size="sm" />
        </View>
      </View>

      <View style={card.amountCol}>
        {isFree ? (
          <Text style={[ev.free, { color: brand.success }]}>Free</Text>
        ) : (
          <Text style={[card.amount, { color: brand.cream }]}>₹{reg.amount.toLocaleString('en-IN')}</Text>
        )}
        {reg.paymentStatus === 'paid' && (
          <View style={[card.paidBadge, { backgroundColor: '#DCFCE7', marginTop: 4 }]}>
            <Text style={[card.paidText, { color: brand.success }]}>Paid</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const ev = StyleSheet.create({
  emojiCircle: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-start' },
  emoji:       { fontSize: 22 },
  free:        { fontSize: 13, fontWeight: '600' },
});

// ─── Print Order Card ─────────────────────────────────────────────────────────

function PrintOrderCard({ order }: { order: PrintOrder }) {
  const { brand } = useTheme();
  const emoji  = CAT_EMOJI[order.categoryId] ?? '🖨️';
  const amount = order.quoteAmount;
  const printStatus = order.status as string;

  const printStatusForBadge = (() => {
    if (['completed', 'ready'].includes(printStatus)) return 'completed';
    if (['cancelled', 'expired'].includes(printStatus)) return 'cancelled';
    if (['confirmed', 'in_production'].includes(printStatus)) return 'confirmed';
    return 'pending';
  })();

  return (
    <Pressable
      style={({ pressed }) => [
        card.wrap,
        { backgroundColor: brand.surface1, borderColor: brand.border1, opacity: pressed ? 0.8 : 1 },
      ]}
      onPress={() => router.push(`/(user)/print-order?orderId=${order.id}` as never)}
    >
      <View style={[ev.emojiCircle, { backgroundColor: brand.primaryGlow }]}>
        <Text style={ev.emoji}>{emoji}</Text>
      </View>

      <View style={card.info}>
        <Text style={[card.name, { color: brand.cream }]} numberOfLines={1}>
          {order.title || order.categoryLabel}
        </Text>
        {order.businessName ? (
          <Text style={[card.meta, { color: brand.creamSub }]} numberOfLines={1}>{order.businessName}</Text>
        ) : null}
        <Text style={[card.meta, { color: brand.creamMuted }]} numberOfLines={1}>{order.city}</Text>
        <View style={{ marginTop: 4 }}>
          <StatusBadge status={printStatusForBadge} label={printStatusLabel(printStatus)} size="sm" />
        </View>
      </View>

      <View style={[card.amountCol, { gap: 4 }]}>
        {amount != null ? (
          <Text style={[card.amount, { color: brand.cream }]}>₹{Math.round(amount).toLocaleString('en-IN')}</Text>
        ) : (
          <Text style={[card.meta, { color: brand.creamSub }]}>TBD</Text>
        )}
        <Ionicons name="chevron-forward" size={14} color={brand.creamMuted} />
      </View>
    </Pressable>
  );
}

// ─── Commerce Order Card ──────────────────────────────────────────────────────

const COMMERCE_STATUS_LABELS: Record<string, string> = {
  pending_payment: 'Awaiting payment',
  confirmed:       'Paid — being prepared',
  preparing:       'Preparing',
  ready:           'Ready for pickup',
  completed:       'Completed',
  cancelled:       'Cancelled',
  expired:         'Expired',
};

function commerceStatusForBadge(status: string): string {
  if (['completed', 'ready'].includes(status)) return 'completed';
  if (['cancelled', 'expired'].includes(status)) return 'cancelled';
  if (['confirmed', 'preparing'].includes(status)) return 'confirmed';
  return 'pending';
}

function CommerceOrderCard({ order }: { order: CommerceOrder }) {
  const { brand } = useTheme();
  const orderId = '#' + order.id.replace(/-/g, '').slice(-8).toUpperCase();

  return (
    <Pressable
      style={({ pressed }) => [card.wrap, { backgroundColor: brand.surface1, borderColor: brand.border1, opacity: pressed ? 0.75 : 1 }]}
      onPress={() => router.push({ pathname: '/(user)/commerce-order-detail', params: { id: order.id } } as never)}
    >
      <View style={[ev.emojiCircle, { backgroundColor: brand.primaryGlow }]}>
        <Text style={ev.emoji}>🛍️</Text>
      </View>
      <View style={card.info}>
        <Text style={[card.name, { color: brand.cream }]} numberOfLines={1}>
          {order.businessName}
        </Text>
        <Text style={[card.meta, { color: brand.creamSub }]} numberOfLines={1}>
          {orderId} · {order.items.map((i) => `${i.quantity}× ${i.name}`).join(', ')}
        </Text>
        <View style={{ marginTop: 4 }}>
          <StatusBadge
            status={commerceStatusForBadge(order.status)}
            label={COMMERCE_STATUS_LABELS[order.status] ?? order.status}
            size="sm"
          />
        </View>
      </View>
      <View style={card.amountCol}>
        <Text style={[card.amount, { color: brand.cream }]}>
          ₹{order.amount.toLocaleString('en-IN')}
        </Text>
        {order.paymentStatus === 'paid' && (
          <View style={[card.paidBadge, { backgroundColor: '#DCFCE7', marginTop: 4 }]}>
            <Text style={[card.paidText, { color: brand.success }]}>Paid</Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────

function SectionHeaderRow({ title, count, accent }: { title: string; count: number; accent?: boolean }) {
  const { brand } = useTheme();
  return (
    <View style={sh.row}>
      <Text style={[sh.title, { color: brand.cream }]}>{title}</Text>
      <View style={[sh.badge, { backgroundColor: accent ? `${brand.success}20` : brand.surface2 }]}>
        <Text style={[sh.count, { color: accent ? brand.success : brand.creamSub }]}>{count}</Text>
      </View>
    </View>
  );
}

const sh = StyleSheet.create({
  row:   { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, marginTop: Spacing.three, marginBottom: Spacing.two },
  title: { fontSize: 14, fontWeight: '700', flex: 1 },
  badge: { borderRadius: Radius.pill, paddingHorizontal: Spacing.two, paddingVertical: 2 },
  count: { fontSize: 12, fontWeight: '600' },
});

// ─── List item types ──────────────────────────────────────────────────────────

type ListItem =
  | { type: 'section-header';  key: string; title: string; count: number; accent?: boolean }
  | { type: 'booking';         key: string; booking: CustomerBooking }
  | { type: 'event-reg';       key: string; reg: CustomerEventRegistration }
  | { type: 'print-order';     key: string; order: PrintOrder }
  | { type: 'commerce-order';  key: string; order: CommerceOrder };

// ─── Main Screen ──────────────────────────────────────────────────────────────

function isAuthError(msg: string) {
  return /forbidden|unauthorized|401|403|access denied|token/i.test(msg);
}

export default function CustomerOrdersScreen() {
  const { brand } = useTheme();
  const token    = useAuthStore((s) => s.token);
  const clearAuth = useAuthStore((s) => s.clearAuth);

  const [bookings,       setBookings]       = useState<CustomerBooking[]>([]);
  const [eventRegs,      setEventRegs]      = useState<CustomerEventRegistration[]>([]);
  const [printOrders,    setPrintOrders]    = useState<PrintOrder[]>([]);
  const [commerceOrders, setCommerceOrders] = useState<CommerceOrder[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [refreshing,     setRefreshing]     = useState(false);
  const [error,          setError]          = useState<string | null>(null);
  const [cancellingId,   setCancellingId]   = useState<string | null>(null);
  const [refundingId,    setRefundingId]    = useState<string | null>(null);
  const [activeTab,      setActiveTab]      = useState<TabKey>('all');
  const [filterOpen,     setFilterOpen]     = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (!token) return;
    try {
      isRefresh ? setRefreshing(true) : setLoading(true);
      setError(null);
      const [bks, regs, prints, commerce] = await Promise.all([
        listCustomerBookings(token),
        listMyEventRegistrations(token),
        listMyPrintOrders(token).catch(() => [] as PrintOrder[]),
        listMyCommerceOrders(token).catch(() => [] as CommerceOrder[]),
      ]);
      setBookings(bks);
      setEventRegs(regs);
      setPrintOrders(prints);
      setCommerceOrders(commerce);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load bookings');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const handleCancel = useCallback(async (id: string) => {
    if (!token) return;
    setCancellingId(id);
    try {
      await cancelCustomerBooking(id, token);
      setBookings((prev) => prev.map((b) => b.id === id ? { ...b, status: 'cancelled' } : b));
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not cancel booking');
    } finally {
      setCancellingId(null);
    }
  }, [token]);

  const handleRefund = useCallback(async (id: string) => {
    if (!token) return;
    Alert.alert(
      'Request Refund',
      'Submit a refund request for this cancelled booking?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Request Refund',
          onPress: async () => {
            setRefundingId(id);
            try {
              await requestBookingRefund(id, token);
              setBookings((prev) => prev.map((b) => b.id === id ? { ...b, status: 'refunded' } : b));
            } catch {
              Alert.alert(
                'Refund Unavailable',
                'Automated refunds are not available for this booking. Please contact support at support@ruxstar.in',
              );
            } finally {
              setRefundingId(null);
            }
          },
        },
      ],
    );
  }, [token]);

  const now = Date.now();

  const upcoming = useMemo(
    () => bookings
      .filter((b) => b.status !== 'cancelled' && new Date(b.startAt).getTime() > now)
      .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()),
    [bookings],
  );

  const past = useMemo(
    () => bookings
      .filter((b) => b.status === 'cancelled' || new Date(b.startAt).getTime() <= now)
      .sort((a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime()),
    [bookings],
  );

  const sortedRegs = useMemo(
    () => [...eventRegs].sort((a, b) => b.startAt.localeCompare(a.startAt)),
    [eventRegs],
  );

  const activePrints = useMemo(
    () => printOrders.filter((o) => !['completed', 'cancelled', 'expired'].includes(o.status)),
    [printOrders],
  );

  const pastPrints = useMemo(
    () => printOrders.filter((o) => ['completed', 'cancelled', 'expired'].includes(o.status)),
    [printOrders],
  );

  const activeCommerceOrders = useMemo(
    () => commerceOrders.filter((o) => !['completed', 'cancelled', 'expired'].includes(o.status)),
    [commerceOrders],
  );

  const pastCommerceOrders = useMemo(
    () => commerceOrders.filter((o) => ['completed', 'cancelled', 'expired'].includes(o.status)),
    [commerceOrders],
  );

  const listData = useMemo<ListItem[]>(() => {
    const items: ListItem[] = [];

    const showUpcoming = activeTab === 'all' || activeTab === 'upcoming';
    const showEvents   = activeTab === 'all' || activeTab === 'events';
    const showCommerce = activeTab === 'all' || activeTab === 'commerce';
    const showPast     = activeTab === 'all' || activeTab === 'past';

    if (showUpcoming && upcoming.length > 0) {
      items.push({ type: 'section-header', key: 'hdr-upcoming', title: 'Upcoming Bookings', count: upcoming.length, accent: true });
      upcoming.forEach((b) => items.push({ type: 'booking', key: b.id, booking: b }));
    }

    if (showEvents && sortedRegs.length > 0) {
      items.push({ type: 'section-header', key: 'hdr-events', title: 'My Events & Tournaments', count: sortedRegs.length });
      sortedRegs.forEach((r) => items.push({ type: 'event-reg', key: r.id, reg: r }));
    }

    if (showUpcoming && activePrints.length > 0) {
      items.push({ type: 'section-header', key: 'hdr-print', title: 'Print Orders', count: activePrints.length, accent: true });
      activePrints.forEach((o) => items.push({ type: 'print-order', key: `print-${o.id}`, order: o }));
    }

    if (showCommerce && activeCommerceOrders.length > 0) {
      items.push({ type: 'section-header', key: 'hdr-commerce', title: 'Shop Orders', count: activeCommerceOrders.length, accent: true });
      activeCommerceOrders.forEach((o) => items.push({ type: 'commerce-order', key: `commerce-${o.id}`, order: o }));
    }

    if (showPast && past.length > 0) {
      items.push({ type: 'section-header', key: 'hdr-past', title: 'Past & Cancelled', count: past.length });
      past.forEach((b) => items.push({ type: 'booking', key: `past-${b.id}`, booking: b }));
    }

    if (showPast && pastPrints.length > 0) {
      items.push({ type: 'section-header', key: 'hdr-print-past', title: 'Past Print Orders', count: pastPrints.length });
      pastPrints.forEach((o) => items.push({ type: 'print-order', key: `print-past-${o.id}`, order: o }));
    }

    if (showCommerce && pastCommerceOrders.length > 0) {
      items.push({ type: 'section-header', key: 'hdr-commerce-past', title: 'Past Shop Orders', count: pastCommerceOrders.length });
      pastCommerceOrders.forEach((o) => items.push({ type: 'commerce-order', key: `commerce-past-${o.id}`, order: o }));
    }

    return items;
  }, [activeTab, upcoming, sortedRegs, activePrints, activeCommerceOrders, past, pastPrints, pastCommerceOrders]);

  const isEmpty = listData.length === 0;

  return (
    <SafeAreaView style={[s.screen, { backgroundColor: brand.bg }]} edges={['top']}>
      {/* ── Header ── */}
      <View style={s.header}>
        <View>
          <Text style={[s.headerTitle, { color: brand.cream }]}>My Bookings</Text>
          <Text style={[s.headerSub, { color: brand.creamMuted }]}>Reservations &amp; event registrations</Text>
        </View>
      </View>

      {/* ── Filter dropdown ── */}
      <View style={s.filterRow}>
        <Pressable
          style={[s.filterBtn, { backgroundColor: brand.surface1, borderColor: brand.border2 }]}
          onPress={() => setFilterOpen((v) => !v)}
        >
          <Text style={[s.filterBtnText, { color: brand.cream }]} numberOfLines={1}>
            {TAB_OPTS.find((o) => o.value === activeTab)?.label ?? 'All Bookings'}
          </Text>
          <Ionicons name={filterOpen ? 'chevron-up' : 'chevron-down'} size={16} color={brand.creamMuted} />
        </Pressable>

        {filterOpen && (
          <View style={[s.filterMenu, { backgroundColor: brand.surface1, borderColor: brand.border2 }]}>
            {TAB_OPTS.map((opt) => (
              <Pressable
                key={opt.value}
                style={[s.filterMenuItem, activeTab === opt.value && { backgroundColor: brand.primaryGlow }]}
                onPress={() => { setActiveTab(opt.value as TabKey); setFilterOpen(false); }}
              >
                <Text style={[s.filterMenuText, { color: activeTab === opt.value ? brand.primary : brand.cream }]}>
                  {opt.label}
                </Text>
                {activeTab === opt.value && (
                  <Ionicons name="checkmark" size={16} color={brand.primary} />
                )}
              </Pressable>
            ))}
          </View>
        )}
      </View>

      {/* ── Content ── */}
      {loading ? (
        <View style={s.centered}>
          <ActivityIndicator size="large" color={brand.primary} />
        </View>
      ) : error ? (
        <View style={s.centered}>
          {isAuthError(error) ? (
            <>
              <View style={[s.errorIcon, { backgroundColor: `${brand.warning}15` }]}>
                <Ionicons name="lock-closed-outline" size={34} color={brand.warning} />
              </View>
              <Text style={[s.errorTitle, { color: brand.cream }]}>Session Expired</Text>
              <Text style={[s.errorText, { color: brand.creamSub }]}>
                Your session has expired. Please sign in again to view your bookings.
              </Text>
              <Pressable
                style={[s.retryBtn, { backgroundColor: brand.primary }]}
                onPress={() => { clearAuth(); router.replace('/(auth)/welcome'); }}
              >
                <Text style={s.retryBtnText}>Sign In Again</Text>
              </Pressable>
            </>
          ) : (
            <>
              <View style={[s.errorIcon, { backgroundColor: `${brand.error}12` }]}>
                <Ionicons name="cloud-offline-outline" size={34} color={brand.error} />
              </View>
              <Text style={[s.errorTitle, { color: brand.cream }]}>Could Not Load</Text>
              <Text style={[s.errorText, { color: brand.creamSub }]}>{error}</Text>
              <Pressable style={[s.retryBtn, { backgroundColor: brand.primary }]} onPress={() => load()}>
                <Text style={s.retryBtnText}>Try Again</Text>
              </Pressable>
            </>
          )}
        </View>
      ) : isEmpty ? (
        <View style={s.centered}>
          <Text style={s.emptyIcon}>🗓️</Text>
          <Text style={[s.emptyTitle, { color: brand.cream }]}>No bookings yet</Text>
          <Text style={[s.emptySub, { color: brand.creamSub }]}>
            Your reservations and event registrations will appear here
          </Text>
          <Pressable
            style={[s.discoverBtn, { backgroundColor: brand.primary }]}
            onPress={() => router.push('/(user)/index' as never)}
          >
            <Ionicons name="compass-outline" size={16} color="#fff" />
            <Text style={s.discoverBtnText}>Find a place to book</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={listData}
          keyExtractor={(item) => item.key}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => load(true)}
              tintColor={brand.primary}
            />
          }
          renderItem={({ item }) => {
            if (item.type === 'section-header') {
              return <SectionHeaderRow title={item.title} count={item.count} accent={item.accent} />;
            }
            if (item.type === 'event-reg') {
              return <EventCard reg={item.reg} />;
            }
            if (item.type === 'print-order') {
              return <PrintOrderCard order={item.order} />;
            }
            if (item.type === 'commerce-order') {
              return <CommerceOrderCard order={item.order} />;
            }
            return (
              <BookingCard
                booking={item.booking}
                onCancel={handleCancel}
                cancelling={cancellingId === item.booking.id}
                onRefund={handleRefund}
                refunding={refundingId === item.booking.id}
              />
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

// ─── Styles (layout only — no Brand.* colors) ─────────────────────────────────

const s = StyleSheet.create({
  screen:   { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.four, gap: Spacing.two },

  header:      { paddingHorizontal: Spacing.four, paddingTop: Spacing.three, paddingBottom: Spacing.two },
  headerTitle: { fontSize: 24, fontWeight: '800' },
  headerSub:   { fontSize: 12, marginTop: 2 },

  filterRow:        { paddingHorizontal: Spacing.four, paddingVertical: Spacing.two, zIndex: 10 },
  filterBtn: {
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'space-between',
    paddingHorizontal: Spacing.three,
    paddingVertical: 11,
    borderRadius:    Radius.lg,
    borderWidth:     1,
  },
  filterBtnText:    { flex: 1, fontSize: 14, fontWeight: '600' },
  filterMenu: {
    position:        'absolute',
    top:             50,
    left:            Spacing.four,
    right:           Spacing.four,
    borderRadius:    Radius.lg,
    borderWidth:     1,
    overflow:        'hidden',
    zIndex:          20,
  },
  filterMenuItem: {
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'space-between',
    paddingHorizontal: Spacing.three,
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.08)',
  },
  filterMenuText:   { fontSize: 14, fontWeight: '500' },

  listContent: { paddingHorizontal: Spacing.four, paddingTop: Spacing.two, paddingBottom: Spacing.six },

  errorIcon:    { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  errorTitle:   { fontSize: 17, fontWeight: '700', marginTop: 4 },
  errorText:    { textAlign: 'center', fontSize: 14, lineHeight: 20 },
  retryBtn:     { borderRadius: Radius.pill, paddingHorizontal: Spacing.four, paddingVertical: Spacing.two + 2, marginTop: 4 },
  retryBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  emptyIcon:  { fontSize: 48, marginBottom: Spacing.two },
  emptyTitle: { fontSize: 18, fontWeight: '600' },
  emptySub:   { fontSize: 14, textAlign: 'center', lineHeight: 20 },

  discoverBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderRadius: Radius.pill, paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two + 2, marginTop: Spacing.two,
  },
  discoverBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});

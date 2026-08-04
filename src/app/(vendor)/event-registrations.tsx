/**
 * Event Registrations Screen
 * Route: /(vendor)/event-registrations?eventId=<id>&businessName=<name>
 *
 * Shows event detail, action buttons (publish/unpublish/cancel),
 * stats row, and filterable list of registrations.
 *
 * Mirrors web: /business/businesses/[id]/events/[eventId]/page.tsx
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Brand, Radius, Spacing } from '@/constants/theme';
import { useAuthStore } from '@/stores/auth-store';
import {
  getVendorEvent,
  setVendorEventStatus,
  type EventRegistration,
  type RuxEvent,
  type EventStatus,
} from '@/services/vendor-event-service';

// ─── Helpers ──────────────────────────────────────────────────────────────────

type RegFilter = 'all' | 'confirmed' | 'pending_payment' | 'cancelled';

function statusColor(status: string): { text: string; bg: string; border: string } {
  switch (status) {
    case 'confirmed':      return { text: Brand.success,   bg: 'rgba(22,163,74,0.08)',  border: 'rgba(22,163,74,0.25)'  };
    case 'pending_payment':return { text: '#D97706',        bg: 'rgba(217,119,6,0.08)', border: 'rgba(217,119,6,0.25)'  };
    case 'cancelled':      return { text: Brand.error,     bg: 'rgba(220,38,38,0.08)', border: 'rgba(220,38,38,0.20)'  };
    default:               return { text: Brand.creamMuted, bg: Brand.surface2,          border: Brand.border1            };
  }
}

function statusLabel(status: string): string {
  switch (status) {
    case 'confirmed':       return 'Confirmed';
    case 'pending_payment': return 'Awaiting payment';
    case 'cancelled':       return 'Cancelled';
    default:                return status;
  }
}

function eventStatusColor(s: EventStatus): { text: string; bg: string; border: string } {
  switch (s) {
    case 'published':  return { text: Brand.success,  bg: 'rgba(22,163,74,0.08)', border: 'rgba(22,163,74,0.25)' };
    case 'cancelled':  return { text: Brand.error,    bg: 'rgba(220,38,38,0.08)', border: 'rgba(220,38,38,0.20)' };
    case 'completed':  return { text: Brand.primary,  bg: Brand.primaryGlow,       border: 'rgba(124,58,237,0.20)'};
    default:           return { text: '#D97706',       bg: 'rgba(217,119,6,0.08)', border: 'rgba(217,119,6,0.25)' };
  }
}

function formatEventDate(iso: string | null): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: 'numeric', minute: '2-digit', hour12: true,
      timeZone: 'Asia/Kolkata',
    });
  } catch { return ''; }
}

// ─── Registration Row ─────────────────────────────────────────────────────────

function RegistrationRow({ reg }: { reg: EventRegistration }) {
  const sc = statusColor(reg.status);
  const isTeam  = reg.format === 'team';
  const name    = isTeam && reg.teamName ? reg.teamName : reg.customerName;
  const initial = (name || '?').charAt(0).toUpperCase();
  const players = isTeam && reg.participants.length > 0
    ? reg.participants.map((p) => p.name).filter(Boolean).join(', ')
    : null;

  return (
    <View style={r.row}>
      {/* Avatar */}
      <View style={r.avatar}>
        <Text style={r.avatarText}>{initial}</Text>
      </View>

      {/* Info */}
      <View style={r.info}>
        <Text style={r.name} numberOfLines={1}>{name || '—'}</Text>
        {isTeam && reg.customerName && reg.customerName !== name ? (
          <Text style={r.sub} numberOfLines={1}>Captain: {reg.customerName}</Text>
        ) : null}
        {reg.customerMobile ? (
          <Text style={r.sub} numberOfLines={1}>{reg.customerMobile}</Text>
        ) : null}
        {players ? (
          <Text style={r.players} numberOfLines={2}>Players: {players}</Text>
        ) : null}
      </View>

      {/* Right side */}
      <View style={r.right}>
        <Text style={r.amount}>
          {reg.amount > 0 ? `₹${reg.amount.toLocaleString('en-IN')}` : 'Free'}
        </Text>
        <View style={[r.badge, { backgroundColor: sc.bg, borderColor: sc.border }]}>
          <Text style={[r.badgeText, { color: sc.text }]}>{statusLabel(reg.status)}</Text>
        </View>
      </View>
    </View>
  );
}

// ─── Stats box ────────────────────────────────────────────────────────────────

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <View style={st.box}>
      <Text style={st.value}>{value}</Text>
      <Text style={st.label}>{label}</Text>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function EventRegistrationsScreen() {
  const { eventId, businessName = 'Event' } = useLocalSearchParams<{
    eventId: string;
    businessName?: string;
  }>();
  const token = useAuthStore((s) => s.token);

  const [event,         setEvent]         = useState<RuxEvent | null>(null);
  const [registrations, setRegistrations] = useState<EventRegistration[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState('');
  const [actionBusy,    setActionBusy]    = useState('');

  const [search,      setSearch]      = useState('');
  const [regFilter,   setRegFilter]   = useState<RegFilter>('all');

  // ── Load data ────────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    if (!token || !eventId) return;
    setLoading(true);
    setError('');
    try {
      const { event: ev, registrations: regs } = await getVendorEvent(token, eventId);
      setEvent(ev);
      setRegistrations(regs);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not load event.');
    } finally {
      setLoading(false);
    }
  }, [token, eventId]);

  useEffect(() => { load(); }, [load]);

  // ── Actions ──────────────────────────────────────────────────────────────────

  async function doAction(action: 'publish' | 'unpublish' | 'cancel') {
    if (!token || !eventId) return;
    if (action === 'cancel') {
      Alert.alert(
        'Cancel Event',
        'This will cancel the event and notify all registrants. This cannot be undone.',
        [
          { text: 'Keep Event', style: 'cancel' },
          {
            text: 'Cancel Event', style: 'destructive',
            onPress: () => void runAction(action),
          },
        ],
      );
      return;
    }
    await runAction(action);
  }

  async function runAction(action: 'publish' | 'unpublish' | 'cancel') {
    if (!token || !eventId) return;
    setActionBusy(action);
    try {
      const updated = await setVendorEventStatus(token, eventId, action);
      setEvent(updated);
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Action failed. Please try again.');
    } finally {
      setActionBusy('');
    }
  }

  // ── Filter registrations ──────────────────────────────────────────────────

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return registrations.filter((reg) => {
      const matchStatus = regFilter === 'all' || reg.status === regFilter;
      const matchSearch = !q || [
        reg.customerName, reg.teamName, reg.customerMobile,
        ...reg.participants.map((p) => p.name),
      ].some((v) => v?.toLowerCase().includes(q));
      return matchStatus && matchSearch;
    });
  }, [registrations, regFilter, search]);

  const counts = useMemo(() => ({
    all:             registrations.length,
    confirmed:       registrations.filter((r) => r.status === 'confirmed').length,
    pending_payment: registrations.filter((r) => r.status === 'pending_payment').length,
    cancelled:       registrations.filter((r) => r.status === 'cancelled').length,
  }), [registrations]);

  // ── Render ───────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <SafeAreaView style={g.screen} edges={['top']}>
        <Header title={businessName} onBack={() => router.navigate('/(vendor)/businesses' as never)} />
        <View style={g.center}>
          <ActivityIndicator size="large" color={Brand.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !event) {
    return (
      <SafeAreaView style={g.screen} edges={['top']}>
        <Header title={businessName} onBack={() => router.navigate('/(vendor)/businesses' as never)} />
        <View style={g.center}>
          <Ionicons name="cloud-offline-outline" size={40} color={Brand.creamMuted} />
          <Text style={g.errorText}>{error || 'Event not found.'}</Text>
          <Pressable style={g.retryBtn} onPress={load}>
            <Text style={g.retryBtnText}>Retry</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const evSC = eventStatusColor(event.status);
  const revenue = event.entryFee * event.confirmedCount;

  return (
    <SafeAreaView style={g.screen} edges={['top']}>
      {/* Header */}
      <Header title={businessName} onBack={() => router.navigate('/(vendor)/businesses' as never)} />

      <FlatList
        data={filtered}
        keyExtractor={(r) => r.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={g.listContent}
        ListHeaderComponent={
          <>
            {/* Event title + status */}
            <View style={g.eventHeader}>
              <Text style={g.eventIcon}>{event.kind === 'tournament' ? '🏆' : '🎫'}</Text>
              <View style={{ flex: 1 }}>
                <Text style={g.eventTitle} numberOfLines={2}>{event.title}</Text>
                {event.startAt ? (
                  <Text style={g.eventDate}>{formatEventDate(event.startAt)}</Text>
                ) : null}
              </View>
              <View style={[g.statusBadge, { backgroundColor: evSC.bg, borderColor: evSC.border }]}>
                <Text style={[g.statusBadgeText, { color: evSC.text }]}>
                  {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                </Text>
              </View>
            </View>

            {/* Action row */}
            <View style={g.actionRow}>
              {event.status === 'draft' && (
                <ActionBtn
                  label="Publish"
                  icon="checkmark-circle-outline"
                  color={Brand.success}
                  busy={actionBusy === 'publish'}
                  onPress={() => doAction('publish')}
                />
              )}
              {event.status === 'published' && (
                <ActionBtn
                  label="Unpublish"
                  icon="eye-off-outline"
                  color={Brand.warning}
                  busy={actionBusy === 'unpublish'}
                  onPress={() => doAction('unpublish')}
                />
              )}
              <ActionBtn
                label="Edit"
                icon="create-outline"
                color={Brand.primary}
                busy={false}
                onPress={() =>
                  Alert.alert('Coming Soon', 'Event editing will be available in a future update.')
                }
              />
              {event.status !== 'cancelled' && (
                <ActionBtn
                  label="Cancel"
                  icon="close-circle-outline"
                  color={Brand.error}
                  busy={actionBusy === 'cancel'}
                  onPress={() => doAction('cancel')}
                />
              )}
            </View>

            {/* Stats row */}
            <View style={g.statsRow}>
              <StatBox label="Registered"  value={String(event.confirmedCount)} />
              <StatBox label="Capacity"    value={event.capacity ? String(event.capacity) : '∞'} />
              <StatBox label="Entry fee"   value={event.entryFee > 0 ? `₹${event.entryFee.toLocaleString('en-IN')}` : 'Free'} />
              <StatBox label="Revenue"     value={revenue > 0 ? `₹${revenue.toLocaleString('en-IN')}` : '₹0'} />
            </View>

            {/* Venue + registration deadline */}
            {(event.venue || event.registrationDeadline) ? (
              <View style={g.detailRow}>
                {event.venue ? (
                  <View style={g.detailItem}>
                    <Ionicons name="location-outline" size={13} color={Brand.creamMuted} />
                    <Text style={g.detailText} numberOfLines={1}>{event.venue}</Text>
                  </View>
                ) : null}
                {event.registrationDeadline ? (
                  <View style={g.detailItem}>
                    <Ionicons name="time-outline" size={13} color={Brand.creamMuted} />
                    <Text style={g.detailText}>
                      Reg closes: {formatEventDate(event.registrationDeadline)}
                    </Text>
                  </View>
                ) : null}
              </View>
            ) : null}

            {/* Registrations heading + search */}
            <View style={g.regHeader}>
              <Text style={g.regTitle}>Registrations</Text>
              <Text style={g.regCount}>{counts.all}</Text>
            </View>

            {/* Search */}
            <View style={g.searchWrap}>
              <Ionicons name="search-outline" size={15} color={Brand.creamMuted} />
              <TextInput
                style={g.searchInput}
                placeholder="Search by name, team, or phone…"
                placeholderTextColor={Brand.creamMuted}
                value={search}
                onChangeText={setSearch}
                clearButtonMode="while-editing"
              />
            </View>

            {/* Filter chips */}
            <View style={g.chipRow}>
              {(['all', 'confirmed', 'pending_payment', 'cancelled'] as RegFilter[]).map((f) => (
                <Pressable
                  key={f}
                  style={[g.chip, regFilter === f && g.chipActive]}
                  onPress={() => setRegFilter(f)}
                >
                  <Text style={[g.chipText, regFilter === f && g.chipTextActive]}>
                    {f === 'all' ? 'All' : f === 'pending_payment' ? 'Awaiting' : f.charAt(0).toUpperCase() + f.slice(1)}
                  </Text>
                  <Text style={[g.chipCount, regFilter === f && g.chipCountActive]}>
                    {counts[f]}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Empty state */}
            {filtered.length === 0 && (
              <View style={g.emptyWrap}>
                <Ionicons name="people-outline" size={36} color={Brand.creamMuted} />
                <Text style={g.emptyTitle}>
                  {registrations.length === 0
                    ? (event.status === 'draft' ? 'Publish to start accepting registrations' : 'No registrations yet')
                    : 'No matches'}
                </Text>
                <Text style={g.emptySub}>
                  {registrations.length === 0
                    ? 'Registrations will appear here once people sign up.'
                    : 'Try a different search or filter.'}
                </Text>
              </View>
            )}
          </>
        }
        renderItem={({ item }) => <RegistrationRow reg={item} />}
        ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: Brand.border1, marginHorizontal: Spacing.four }} />}
      />
    </SafeAreaView>
  );
}

// ─── Action Button ────────────────────────────────────────────────────────────

function ActionBtn({
  label, icon, color, busy, onPress,
}: {
  label: string;
  icon:  keyof typeof Ionicons.glyphMap;
  color: string;
  busy:  boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[a.btn, { borderColor: `${color}40` }]}
      onPress={onPress}
      disabled={busy}
    >
      {busy
        ? <ActivityIndicator size="small" color={color} />
        : <Ionicons name={icon} size={15} color={color} />}
      <Text style={[a.label, { color }]}>{label}</Text>
    </Pressable>
  );
}

// ─── Header ───────────────────────────────────────────────────────────────────

function Header({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <View style={g.header}>
      <Pressable onPress={onBack} hitSlop={8} style={g.backBtn}>
        <Ionicons name="chevron-back" size={22} color={Brand.cream} />
      </Pressable>
      <Text style={g.headerTitle} numberOfLines={1}>{title}</Text>
      <View style={{ width: 36 }} />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const g = StyleSheet.create({
  screen:    { flex: 1, backgroundColor: Brand.bg },
  center:    { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.two, padding: Spacing.four },
  listContent: { paddingBottom: 40 },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.three, paddingVertical: Spacing.two + 2,
    borderBottomWidth: 1, borderBottomColor: Brand.border1, gap: Spacing.two,
  },
  backBtn:     { width: 36, height: 36, borderRadius: Radius.md, backgroundColor: Brand.surface1, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Brand.border1 },
  headerTitle: { flex: 1, fontSize: 16, fontWeight: '700', color: Brand.cream, textAlign: 'center' },

  eventHeader: {
    flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two,
    padding: Spacing.four, borderBottomWidth: 1, borderBottomColor: Brand.border1,
  },
  eventIcon:  { fontSize: 28, marginTop: 2 },
  eventTitle: { fontSize: 17, fontWeight: '800', color: Brand.cream, lineHeight: 22 },
  eventDate:  { fontSize: 12, color: Brand.creamMuted, marginTop: 3 },
  statusBadge: {
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: Radius.pill, borderWidth: 1,
    alignSelf: 'flex-start', marginTop: 2,
  },
  statusBadgeText: { fontSize: 11, fontWeight: '700' },

  actionRow: {
    flexDirection: 'row', gap: Spacing.two, flexWrap: 'wrap',
    paddingHorizontal: Spacing.four, paddingVertical: Spacing.three,
    borderBottomWidth: 1, borderBottomColor: Brand.border1,
  },

  statsRow: {
    flexDirection: 'row',
    borderBottomWidth: 1, borderBottomColor: Brand.border1,
  },

  detailRow: {
    gap: Spacing.one + 2,
    paddingHorizontal: Spacing.four, paddingVertical: Spacing.two + 2,
    borderBottomWidth: 1, borderBottomColor: Brand.border1,
  },
  detailItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  detailText: { fontSize: 12, color: Brand.creamSub, flex: 1 },

  regHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: Spacing.four, paddingTop: Spacing.three, paddingBottom: Spacing.one + 2,
  },
  regTitle: { fontSize: 15, fontWeight: '700', color: Brand.cream, flex: 1 },
  regCount: {
    fontSize: 12, fontWeight: '700', color: Brand.primary,
    backgroundColor: Brand.primaryGlow, borderRadius: Radius.pill,
    paddingHorizontal: 7, paddingVertical: 2,
  },

  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.two,
    marginHorizontal: Spacing.four, marginBottom: Spacing.two,
    backgroundColor: Brand.surface1, borderRadius: Radius.md,
    paddingHorizontal: Spacing.three, paddingVertical: 10,
    borderWidth: 1, borderColor: Brand.border1,
  },
  searchInput: { flex: 1, fontSize: 14, color: Brand.cream, padding: 0 },

  chipRow: {
    flexDirection: 'row', gap: Spacing.two,
    paddingHorizontal: Spacing.four, paddingBottom: Spacing.two,
    flexWrap: 'wrap',
  },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: Spacing.two + 2, paddingVertical: 6,
    borderRadius: Radius.pill, borderWidth: 1,
    borderColor: Brand.border2, backgroundColor: Brand.surface1,
  },
  chipActive:     { backgroundColor: Brand.primary, borderColor: Brand.primary },
  chipText:       { fontSize: 12, fontWeight: '600', color: Brand.creamSub },
  chipTextActive: { color: '#fff' },
  chipCount:      { fontSize: 11, fontWeight: '700', color: Brand.creamMuted },
  chipCountActive:{ color: 'rgba(255,255,255,0.8)' },

  emptyWrap:  { alignItems: 'center', gap: Spacing.one + 2, padding: Spacing.five },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: Brand.cream, textAlign: 'center' },
  emptySub:   { fontSize: 13, color: Brand.creamSub, textAlign: 'center', lineHeight: 18 },

  errorText:    { color: Brand.error, textAlign: 'center', fontSize: 14 },
  retryBtn:     { backgroundColor: Brand.primary, borderRadius: Radius.pill, paddingHorizontal: Spacing.four, paddingVertical: Spacing.two + 2 },
  retryBtnText: { color: '#fff', fontWeight: '600' },
});

const r = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two,
    paddingHorizontal: Spacing.four, paddingVertical: Spacing.three,
  },
  avatar: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: Brand.primaryGlow,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 15, fontWeight: '800', color: Brand.primary },
  info:    { flex: 1, gap: 2 },
  name:    { fontSize: 14, fontWeight: '700', color: Brand.cream },
  sub:     { fontSize: 12, color: Brand.creamMuted },
  players: { fontSize: 11, color: Brand.creamSub, marginTop: 2, lineHeight: 15 },
  right:   { alignItems: 'flex-end', gap: 4 },
  amount:  { fontSize: 13, fontWeight: '700', color: Brand.cream },
  badge: {
    paddingHorizontal: 7, paddingVertical: 2,
    borderRadius: Radius.pill, borderWidth: 1,
  },
  badgeText: { fontSize: 10, fontWeight: '700' },
});

const st = StyleSheet.create({
  box: {
    flex: 1, alignItems: 'center', paddingVertical: Spacing.three,
    borderRightWidth: 1, borderRightColor: Brand.border1,
  },
  value: { fontSize: 16, fontWeight: '800', color: Brand.cream },
  label: { fontSize: 10, color: Brand.creamMuted, marginTop: 2, fontWeight: '500' },
});

const a = StyleSheet.create({
  btn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: Spacing.three, paddingVertical: 8,
    borderRadius: Radius.pill, borderWidth: 1,
    backgroundColor: Brand.surface1,
  },
  label: { fontSize: 13, fontWeight: '600' },
});

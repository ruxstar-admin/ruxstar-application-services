/**
 * Vendor Creator Bookings — list creator bookings, advance status.
 * Workflow: confirmed → in_progress → completed
 */

import { useCallback, useState } from 'react';
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
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/stores/auth-store';
import { useTheme } from '@/hooks/useTheme';
import { Radius, Spacing } from '@/constants/theme';
import VendorHeader from '@/components/vendor/VendorHeader';
import {
  listVendorCreatorBookings,
  updateCreatorBookingStatus,
  type CreatorBooking,
} from '@/services/creator-service';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const NEXT: Record<string, string> = {
  confirmed:   'in_progress',
  in_progress: 'completed',
};

const NEXT_LABEL: Record<string, string> = {
  confirmed:   'Start work',
  in_progress: 'Mark completed',
};

const STATUS_COLORS: Record<string, string> = {
  pending_payment: '#F59E0B',
  confirmed:       '#7C3AED',
  in_progress:     '#3B82F6',
  completed:       '#10B981',
  cancelled:       '#EF4444',
};

const KIND_ICON: Record<string, string> = {
  shoutout:   'megaphone-outline',
  collab:     'people-outline',
  appearance: 'star-outline',
};

// ─── Booking Card ─────────────────────────────────────────────────────────────

function BookingCard({
  booking,
  onAdvance,
  advancing,
}: {
  booking:   CreatorBooking;
  onAdvance: (id: string, next: string) => void;
  advancing: boolean;
}) {
  const { brand } = useTheme();
  const next      = NEXT[booking.status];
  const color     = STATUS_COLORS[booking.status] ?? brand.creamMuted;
  const icon      = (KIND_ICON[booking.offerKind] ?? 'star-outline') as never;

  return (
    <View style={[bc.card, { backgroundColor: brand.surface1, borderColor: brand.border1 }]}>
      {/* Header row */}
      <View style={bc.row}>
        <View style={[bc.iconWrap, { backgroundColor: `${brand.primary}15` }]}>
          <Ionicons name={icon} size={20} color={brand.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[bc.offerTitle, { color: brand.cream }]} numberOfLines={1}>
            {booking.offerTitle}
          </Text>
          <Text style={[bc.meta, { color: brand.creamSub }]} numberOfLines={1}>
            {booking.businessName}
          </Text>
        </View>
        <View style={[bc.statusBadge, { backgroundColor: `${color}18` }]}>
          <Text style={[bc.statusText, { color }]}>
            {booking.status.replace('_', ' ')}
          </Text>
        </View>
      </View>

      {/* Customer info */}
      <View style={[bc.divider, { backgroundColor: brand.border1 }]} />
      <View style={bc.infoRow}>
        <Ionicons name="person-outline" size={13} color={brand.creamMuted} />
        <Text style={[bc.infoText, { color: brand.creamSub }]}>{booking.customerName}</Text>
        <Text style={[bc.dot, { color: brand.creamMuted }]}>·</Text>
        <Ionicons name="call-outline" size={13} color={brand.creamMuted} />
        <Text style={[bc.infoText, { color: brand.creamSub }]}>{booking.customerMobile}</Text>
      </View>

      {/* Brief */}
      {booking.brief ? (
        <View style={[bc.briefBox, { backgroundColor: brand.surface2, borderColor: brand.border1 }]}>
          <Text style={[bc.briefLabel, { color: brand.creamMuted }]}>BRIEF</Text>
          <Text style={[bc.briefText, { color: brand.creamSub }]}>{booking.brief}</Text>
        </View>
      ) : null}

      {/* Footer */}
      <View style={bc.footer}>
        <Text style={[bc.amount, { color: brand.cream }]}>
          ₹{booking.amount.toLocaleString('en-IN')}
        </Text>
        {booking.turnaroundDays != null && (
          <Text style={[bc.turnText, { color: brand.creamMuted }]}>
            {booking.turnaroundDays}d turnaround
          </Text>
        )}
        {next ? (
          <Pressable
            style={[bc.advBtn, { backgroundColor: brand.primary }, advancing && { opacity: 0.6 }]}
            onPress={() => onAdvance(booking.id, next)}
            disabled={advancing}
          >
            {advancing
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text style={bc.advBtnText}>{NEXT_LABEL[booking.status]}</Text>
            }
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function CreatorBookingsScreen() {
  const { brand }  = useTheme();
  const token      = useAuthStore((s) => s.token);
  const [bookings, setBookings]     = useState<CreatorBooking[]>([]);
  const [loading,  setLoading]      = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [advancingId, setAdvancingId] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (!token) return;
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const data = await listVendorCreatorBookings(token);
      setBookings(data);
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not load bookings');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function advance(bookingId: string, nextStatus: string) {
    if (!token) return;
    setAdvancingId(bookingId);
    try {
      const updated = await updateCreatorBookingStatus(token, bookingId, nextStatus);
      setBookings((prev) => prev.map((b) => b.id === updated.id ? updated : b));
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not update status');
    } finally {
      setAdvancingId(null);
    }
  }

  return (
    <SafeAreaView style={[s.screen, { backgroundColor: brand.bg }]} edges={['top']}>
      <VendorHeader />

      {loading ? (
        <View style={s.centered}>
          <ActivityIndicator size="large" color={brand.primary} />
        </View>
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={(b) => b.id}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={brand.primary} />
          }
          ListEmptyComponent={
            <View style={s.centered}>
              <Ionicons name="megaphone-outline" size={48} color={brand.creamMuted} />
              <Text style={[s.emptyText, { color: brand.creamMuted }]}>No bookings yet</Text>
            </View>
          }
          renderItem={({ item }) => (
            <BookingCard
              booking={item}
              onAdvance={advance}
              advancing={advancingId === item.id}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  screen:    { flex: 1 },
  centered:  { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.two },
  emptyText: { fontSize: 15, fontWeight: '500' },
  list:      { padding: Spacing.three, gap: Spacing.two, paddingBottom: Spacing.six },
});

const bc = StyleSheet.create({
  card: {
    borderRadius:  Radius.xl,
    borderWidth:   1,
    padding:       Spacing.three,
    gap:           Spacing.two,
  },
  row:      { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  iconWrap: {
    width: 40, height: 40, borderRadius: Radius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  offerTitle: { fontSize: 15, fontWeight: '700' },
  meta:       { fontSize: 12, marginTop: 2 },
  statusBadge: {
    paddingHorizontal: Spacing.two,
    paddingVertical:   3,
    borderRadius:      Radius.pill,
  },
  statusText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  divider:    { height: 1 },
  infoRow:    { flexDirection: 'row', alignItems: 'center', gap: 5 },
  infoText:   { fontSize: 13 },
  dot:        { fontSize: 13 },
  briefBox: {
    borderRadius: Radius.md,
    borderWidth:  1,
    padding:      Spacing.two,
    gap:          4,
  },
  briefLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.6 },
  briefText:  { fontSize: 13, lineHeight: 18 },
  footer: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           Spacing.two,
    flexWrap:      'wrap',
  },
  amount:    { fontSize: 16, fontWeight: '800', flex: 1 },
  turnText:  { fontSize: 12 },
  advBtn: {
    paddingHorizontal: Spacing.three,
    paddingVertical:   8,
    borderRadius:      Radius.lg,
    minWidth:          100,
    alignItems:        'center',
  },
  advBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
});

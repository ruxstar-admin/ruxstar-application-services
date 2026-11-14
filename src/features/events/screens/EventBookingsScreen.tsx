import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SegmentedTabs } from '@/components/ui/SegmentedTabs';
import { Skeleton } from '@/components/ui/Skeleton';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { money } from '@/features/vendor/lib/pod';
import { useAuthToken } from '@/hooks/use-auth-token';
import { usePaginated } from '@/hooks/use-paginated';
import { Feedback } from '@/lib/haptics';
import { VendorEventsService } from '@/services/events-service';
import type { Booking } from '@/types/events';
import { ORDER_STATUS, dayText, timeText } from '../lib/events';

type View_ = 'confirmed' | 'cancelled';
const VIEWS = [
  { key: 'confirmed', label: 'Booked' },
  { key: 'cancelled', label: 'Cancelled' },
] as const;

function BookingCard({ booking }: { booking: Booking }) {
  const [open, setOpen] = useState(false);
  const status = ORDER_STATUS[booking.status];
  const first = booking.tickets[0];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ expanded: open }}
      accessibilityLabel={`Booking ${booking.orderNo}, ${first?.name ?? ''}, ${booking.tickets.length} tickets`}
      onPress={() => {
        Feedback.tap();
        setOpen(!open);
      }}
      style={styles.card}
    >
      <View style={styles.head}>
        <View style={styles.text}>
          <Text style={styles.title} numberOfLines={1}>
            {booking.team ?? first?.name ?? `Booking #${booking.orderNo}`}
          </Text>
          <Text style={styles.small}>{`#${booking.orderNo} · ${booking.tickets.length} ${booking.tickets.length === 1 ? 'ticket' : 'tickets'} · ${dayText(booking.createdAt)}`}</Text>
        </View>
        <View style={styles.right}>
          <Text style={styles.title}>{booking.total ? money(booking.share) : 'Free'}</Text>
          {booking.status !== 'confirmed' ? <Badge label={status.label} tone={status.tone} /> : null}
        </View>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={Brand.textFaint} />
      </View>
      {booking.refunded ? <Text style={styles.small}>{`${money(booking.refunded)} refunded`}</Text> : null}
      {open
        ? booking.tickets.map((t) => (
            <View key={t.id} style={styles.ticket}>
              <View style={styles.ticketHead}>
                <Text style={styles.body}>{t.name}</Text>
                {t.lastIn ? (
                  <View style={styles.inRow}>
                    <Ionicons name="checkmark-circle" size={14} color={Brand.success} />
                    <Text style={styles.in}>{`In ${dayText(t.lastIn)}, ${timeText(t.lastIn)}`}</Text>
                  </View>
                ) : null}
              </View>
              <Text style={styles.small}>{[t.tier, t.code, t.phone].filter(Boolean).join(' · ')}</Text>
              {t.answers.map((a) => (
                <Text key={a.label} style={styles.small}>{`${a.label}: ${a.answer}`}</Text>
              ))}
            </View>
          ))
        : null}
    </Pressable>
  );
}

function List({ eventId, view }: { eventId: string; view: View_ }) {
  const token = useAuthToken();
  const list = usePaginated((cursor) => VendorEventsService.bookings(token, eventId, view, cursor));
  if (list.loading) {
    return (
      <View style={styles.skeletons}>
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} height={72} radius={18} />
        ))}
      </View>
    );
  }
  if (list.error && !list.items.length) return <EmptyState icon="cloud-offline-outline" title="Could not load bookings" actionLabel="Try again" onAction={list.retry} />;
  return (
    <FlatList
      data={list.items}
      keyExtractor={(b) => b.id}
      contentContainerStyle={styles.list}
      refreshControl={<RefreshControl refreshing={list.refreshing} onRefresh={list.refresh} tintColor={Brand.primarySoft} />}
      onEndReached={list.loadMore}
      onEndReachedThreshold={0.5}
      ListFooterComponent={list.loadingMore ? <ActivityIndicator color={Brand.primarySoft} style={styles.footer} /> : null}
      ListEmptyComponent={
        <EmptyState icon="ticket-outline" title={view === 'confirmed' ? 'No bookings yet' : 'No cancelled bookings'} message={view === 'confirmed' ? 'Bookings show up here as people buy tickets.' : undefined} />
      }
      renderItem={({ item }) => <BookingCard booking={item} />}
    />
  );
}

/** Who booked an event, newest first: tap one for each person's ticket, answers and check-in. */
export function EventBookingsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [view, setView] = useState<View_>('confirmed');
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <ScreenHeader title="Bookings" onBack={() => router.back()} />
        <SegmentedTabs options={VIEWS} value={view} onChange={setView} />
      </View>
      <List key={view} eventId={id} view={view} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Brand.bg },
  header: { paddingHorizontal: Spacing.three, gap: Spacing.three, paddingBottom: Spacing.three },
  list: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.five, gap: Spacing.two, flexGrow: 1 },
  skeletons: { gap: Spacing.two, paddingHorizontal: Spacing.three },
  footer: { paddingVertical: Spacing.three },
  card: { gap: Spacing.two, padding: Spacing.three, borderRadius: Radius.lg, backgroundColor: Brand.surface, borderWidth: 1, borderColor: Brand.border },
  head: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  text: { flex: 1, gap: 2 },
  right: { alignItems: 'flex-end', gap: 4 },
  title: { ...Typography.bodyStrong, fontSize: 15, color: Brand.text },
  body: { ...Typography.body, fontSize: 15, color: Brand.text, flex: 1 },
  small: { ...Typography.caption, color: Brand.textMuted },
  ticket: { gap: 2, paddingTop: Spacing.two, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Brand.border },
  ticketHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  inRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  in: { ...Typography.caption, fontSize: 12, color: Brand.success },
});

import { useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SegmentedTabs } from '@/components/ui/SegmentedTabs';
import { Skeleton } from '@/components/ui/Skeleton';
import { Brand, Spacing } from '@/constants/theme';
import { useAuthToken } from '@/hooks/use-auth-token';
import { usePaginated } from '@/hooks/use-paginated';
import { useRefetchOnFocus } from '@/hooks/use-refetch-on-focus';
import { TurfDeskService } from '@/services/turf-service';
import type { DeskBooking, DeskBookingsView } from '@/types/turf';
import { BookingRow } from '../components/BookingRow';
import { BOOKING_STATUS, slotWhen } from '../lib/turf';

const VIEWS = [
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'past', label: 'Past' },
  { key: 'all', label: 'All' },
] as const;

const linesOf = (b: DeskBooking) => {
  const next = b.occurrences.find((o) => o.status === 'booked') ?? b.occurrences[0];
  return [
    next ? slotWhen(next.startAt, next.endAt) : '',
    `${b.court.name}${b.weeks > 1 ? ` · every week for ${b.weeks} weeks` : ''}${b.sport ? ` · ${b.sport.name}` : ''}`,
  ].filter(Boolean);
};

function List({ groundId, view }: { groundId: string; view: DeskBookingsView }) {
  const router = useRouter();
  const token = useAuthToken();
  const list = usePaginated((cursor) => TurfDeskService.bookings(token, groundId, view, cursor));
  useRefetchOnFocus(list.refresh);

  if (list.loading) {
    return (
      <View style={styles.skeletons}>
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} height={84} radius={18} />
        ))}
      </View>
    );
  }
  if (list.error && !list.items.length) return <EmptyState icon="cloud-offline-outline" title="Could not load the bookings" actionLabel="Try again" onAction={list.retry} />;
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
        <EmptyState
          icon="receipt-outline"
          title={view === 'upcoming' ? 'No bookings coming up' : 'No bookings yet'}
          message={view === 'upcoming' ? 'Paid bookings with a date still to come show up here.' : undefined}
        />
      }
      renderItem={({ item }) => (
        <BookingRow
          at={item.firstAt}
          title={item.customer.name}
          lines={linesOf(item)}
          badge={item.status === 'confirmed' ? null : BOOKING_STATUS[item.status]}
          onPress={() => router.push({ pathname: '/(customer)/ground-desk/booking/[id]', params: { id: item.id } })}
        />
      )}
    />
  );
}

/** A ground's bookings for its desk: upcoming by first date, past and all newest first. */
export function DeskBookingsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [view, setView] = useState<DeskBookingsView>('upcoming');
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <ScreenHeader title="Bookings" onBack={() => router.back()} />
        <SegmentedTabs options={VIEWS} value={view} onChange={setView} />
      </View>
      <List key={view} groundId={id} view={view} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Brand.bg },
  header: { paddingHorizontal: Spacing.three, gap: Spacing.three, paddingBottom: Spacing.three },
  list: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.five, gap: Spacing.three, flexGrow: 1 },
  skeletons: { gap: Spacing.three, paddingHorizontal: Spacing.three },
  footer: { paddingVertical: Spacing.three },
});

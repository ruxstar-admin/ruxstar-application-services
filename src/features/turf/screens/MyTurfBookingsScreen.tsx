import { useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SegmentedTabs } from '@/components/ui/SegmentedTabs';
import { Skeleton } from '@/components/ui/Skeleton';
import { Brand, Spacing } from '@/constants/theme';
import { useAuthToken } from '@/hooks/use-auth-token';
import { usePaginated } from '@/hooks/use-paginated';
import { useRefetchOnFocus } from '@/hooks/use-refetch-on-focus';
import { TurfService } from '@/services/turf-service';
import type { MyBookingsView, TurfBooking } from '@/types/turf';
import { BookingRow } from '../components/BookingRow';
import { BOOKING_STATUS, slotWhen } from '../lib/turf';

const VIEWS = [
  { key: 'current', label: 'Upcoming' },
  { key: 'past', label: 'Past' },
] as const;

const linesOf = (b: TurfBooking) => {
  const first = b.occurrences[0];
  return [first ? slotWhen(first.startAt, first.endAt) : '', `${b.court.name}${b.weeks > 1 ? ` · every week for ${b.weeks} weeks` : ''}`].filter(Boolean);
};

function List({ view }: { view: MyBookingsView }) {
  const router = useRouter();
  const token = useAuthToken();
  const list = usePaginated((cursor) => TurfService.bookings(token, view, cursor));
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
  if (list.error && !list.items.length) return <EmptyState icon="cloud-offline-outline" title="Could not load your bookings" actionLabel="Try again" onAction={list.retry} />;
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
          icon="football-outline"
          title={view === 'current' ? 'No bookings coming up' : 'No past bookings'}
          message={view === 'current' ? 'Slots you book at a turf or court show up here.' : undefined}
          actionLabel={view === 'current' ? 'Find a ground' : undefined}
          onAction={view === 'current' ? () => router.push({ pathname: '/(customer)/(tabs)/discover', params: { category: 'turf' } }) : undefined}
        />
      }
      renderItem={({ item }) => (
        <BookingRow
          at={item.firstAt}
          title={item.ground.name}
          lines={linesOf(item)}
          badge={item.status === 'confirmed' ? null : BOOKING_STATUS[item.status]}
          onPress={() => router.push({ pathname: '/(customer)/turf/booking/[id]', params: { id: item.id } })}
        />
      )}
    />
  );
}

/** Your ground bookings: ones with a date still to come, then past ones. */
export function MyTurfBookingsScreen() {
  const router = useRouter();
  const [view, setView] = useState<MyBookingsView>('current');
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <ScreenHeader title="Your ground bookings" onBack={() => router.back()} />
        <SegmentedTabs options={VIEWS} value={view} onChange={setView} />
      </View>
      <List key={view} view={view} />
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

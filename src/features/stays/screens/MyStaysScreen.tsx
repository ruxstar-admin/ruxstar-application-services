import { useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SegmentedTabs } from '@/components/ui/SegmentedTabs';
import { Skeleton } from '@/components/ui/Skeleton';
import { Brand, Spacing } from '@/constants/theme';
import { BookingRow } from '@/features/turf/components/BookingRow';
import { useAuthToken } from '@/hooks/use-auth-token';
import { usePaginated } from '@/hooks/use-paginated';
import { useRefetchOnFocus } from '@/hooks/use-refetch-on-focus';
import { StaysService } from '@/services/stays-service';
import type { MyStaysView } from '@/types/stays';
import { STAY_STATUS, bedsText, stayText } from '../lib/stays';

const VIEWS = [
  { key: 'current', label: 'Current' },
  { key: 'past', label: 'Past' },
] as const;

function List({ view }: { view: MyStaysView }) {
  const router = useRouter();
  const token = useAuthToken();
  const list = usePaginated((cursor) => StaysService.stays(token, view, cursor));
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
  if (list.error && !list.items.length) return <EmptyState icon="cloud-offline-outline" title="Could not load your stays" actionLabel="Try again" onAction={list.retry} />;
  return (
    <FlatList
      data={list.items}
      keyExtractor={(s) => s.id}
      contentContainerStyle={styles.list}
      refreshControl={<RefreshControl refreshing={list.refreshing} onRefresh={list.refresh} tintColor={Brand.primarySoft} />}
      onEndReached={list.loadMore}
      onEndReachedThreshold={0.5}
      ListFooterComponent={list.loadingMore ? <ActivityIndicator color={Brand.primarySoft} style={styles.footer} /> : null}
      ListEmptyComponent={
        <EmptyState
          icon="bed-outline"
          title={view === 'current' ? 'No stays right now' : 'No past stays'}
          message={view === 'current' ? 'Beds and rooms you reserve at a PG or hostel show up here.' : undefined}
          actionLabel={view === 'current' ? 'Find a PG or hostel' : undefined}
          onAction={view === 'current' ? () => router.push({ pathname: '/(customer)/(tabs)/discover', params: { category: 'stays' } }) : undefined}
        />
      }
      renderItem={({ item }) => (
        <BookingRow
          at={item.from}
          title={item.property.name}
          lines={[stayText(item), bedsText(item)]}
          badge={STAY_STATUS[item.status]}
          onPress={() => router.push({ pathname: '/(customer)/stays/order/[id]', params: { id: item.id } })}
        />
      )}
    />
  );
}

/** Your PG and hostel stays: unpaid, waiting for move-in or staying now, then past ones. */
export function MyStaysScreen() {
  const router = useRouter();
  const [view, setView] = useState<MyStaysView>('current');
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <ScreenHeader title="Your stays" onBack={() => router.back()} />
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

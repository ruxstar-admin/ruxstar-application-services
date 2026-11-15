import { useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SegmentedTabs } from '@/components/ui/SegmentedTabs';
import { Skeleton } from '@/components/ui/Skeleton';
import { Brand, Spacing } from '@/constants/theme';
import { StoreOrderRow } from '@/features/store/components/StoreOrderRow';
import { useAuthToken } from '@/hooks/use-auth-token';
import { usePaginated } from '@/hooks/use-paginated';
import { ConsoleStoreService } from '@/services/store-service';
import type { ConsoleStoreOrdersQuery } from '@/types/store';
import { ListFooter, consoleStyles, errorText } from '../components/parts';

const VIEWS = [
  { key: 'all', label: 'All' },
  { key: 'open', label: 'Returns open' },
  { key: 'rejected', label: 'Turned down' },
] as const;
type View_ = (typeof VIEWS)[number]['key'];

function Results({ query }: { query: ConsoleStoreOrdersQuery }) {
  const router = useRouter();
  const token = useAuthToken();
  const list = usePaginated((cursor) => ConsoleStoreService.orders(token, query, cursor));

  if (list.loading) {
    return (
      <View style={consoleStyles.skeletons}>
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} height={72} radius={14} />
        ))}
      </View>
    );
  }
  if (list.error && list.items.length === 0) {
    return <EmptyState icon="cloud-offline-outline" title="Could not load shop orders" message={errorText(list.error)} actionLabel="Try again" onAction={list.retry} />;
  }
  return (
    <FlatList
      data={list.items}
      keyExtractor={(o) => o.id}
      contentContainerStyle={consoleStyles.list}
      refreshControl={<RefreshControl refreshing={list.refreshing} onRefresh={list.refresh} tintColor={Brand.primarySoft} />}
      onEndReached={list.loadMore}
      onEndReachedThreshold={0.5}
      ListEmptyComponent={
        <EmptyState
          icon="bag-handle-outline"
          title={query.returns ? 'No returns here' : 'No shop orders yet'}
          message={query.returns === 'rejected' ? 'Returns a shop turned down show up here, so Ruxstar can look again.' : undefined}
        />
      }
      ListFooterComponent={<ListFooter list={list} />}
      renderItem={({ item }) => (
        <StoreOrderRow
          order={item}
          subtitle={`${item.business.name} · ${item.customer.name}`}
          amount={item.price.total}
          onPress={() => router.push({ pathname: '/(admin)/store-order/[id]', params: { id: item.id } })}
        />
      )}
    />
  );
}

/** Every local shop order, or one shop's, with returns that are open or a shop turned down. */
export function StoreOrdersScreen() {
  const router = useRouter();
  const { shop, label, returns } = useLocalSearchParams<{ shop?: string; label?: string; returns?: string }>();
  const [view, setView] = useState<View_>(returns === 'open' || returns === 'rejected' ? returns : 'all');
  const query: ConsoleStoreOrdersQuery = { ...(shop ? { shop } : {}), ...(view === 'all' ? {} : { returns: view }) };

  return (
    <SafeAreaView style={styles.container}>
      <View style={consoleStyles.pad}>
        <ScreenHeader title={label ? `${label}: orders` : 'Shop orders'} onBack={() => router.back()} />
      </View>
      <View style={styles.controls}>
        <SegmentedTabs options={VIEWS} value={view} onChange={setView} />
      </View>
      <Results key={JSON.stringify(query)} query={query} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Brand.bg },
  controls: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.two },
});

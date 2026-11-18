import { useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChoiceChips } from '@/components/ui/ChoiceChips';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { Brand, Spacing } from '@/constants/theme';
import { useAuthToken } from '@/hooks/use-auth-token';
import { usePaginated } from '@/hooks/use-paginated';
import { useRefetchOnFocus } from '@/hooks/use-refetch-on-focus';
import { GigDeskService } from '@/services/gigs-service';
import type { GigOrderStatus } from '@/types/gigs';
import { GigOrderRow } from '../components/GigOrderRow';

type Filter = 'all' | 'paid' | 'in_progress' | 'delivered' | 'disputed' | 'completed' | 'cancelled';
const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'paid', label: 'New' },
  { key: 'in_progress', label: 'In progress' },
  { key: 'delivered', label: 'Delivered' },
  { key: 'disputed', label: 'Problems' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
];

function Orders({ filter }: { filter: Filter }) {
  const router = useRouter();
  const token = useAuthToken();
  const [now] = useState(Date.now);
  const status: GigOrderStatus | undefined = filter === 'all' ? undefined : filter;
  const list = usePaginated((cursor) => GigDeskService.orders(token, status, cursor));
  useRefetchOnFocus(list.refresh);

  if (list.loading) {
    return (
      <View style={styles.skeletons}>
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} height={72} radius={18} />
        ))}
      </View>
    );
  }
  if (list.error && list.items.length === 0) return <EmptyState icon="cloud-offline-outline" title="Could not load your orders" actionLabel="Try again" onAction={list.retry} />;
  return (
    <FlatList
      data={list.items}
      keyExtractor={(o) => o.id}
      renderItem={({ item }) => (
        <GigOrderRow
          order={item}
          subtitle={item.customer.name}
          amount={item.share}
          now={now}
          onPress={() => router.push({ pathname: '/(customer)/freelance/orders/[id]', params: { id: item.id } })}
        />
      )}
      refreshControl={<RefreshControl refreshing={list.refreshing} onRefresh={list.refresh} tintColor={Brand.primarySoft} />}
      contentContainerStyle={styles.list}
      onEndReached={list.loadMore}
      onEndReachedThreshold={0.5}
      ListEmptyComponent={
        <EmptyState
          icon="file-tray-outline"
          title={filter === 'all' ? 'No orders yet' : 'Nothing here'}
          message={filter === 'all' ? 'Orders for your gigs and offers you send in chat show up here.' : 'No orders like this right now.'}
        />
      }
      ListFooterComponent={list.loadingMore ? <ActivityIndicator color={Brand.primarySoft} style={styles.footer} /> : null}
    />
  );
}

/** The freelancer's orders: new ones to accept, ones being worked on, delivered, with problems, and done with. */
export function DeskGigOrdersScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>('all');
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <ScreenHeader title="Freelance orders" onBack={() => router.back()} />
      </View>
      <View style={styles.chips}>
        <ChoiceChips options={FILTERS} value={filter} onChange={setFilter} />
      </View>
      <Orders key={filter} filter={filter} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Brand.bg },
  header: { paddingHorizontal: Spacing.three },
  chips: { paddingBottom: Spacing.two },
  list: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.five },
  footer: { paddingVertical: Spacing.three },
  skeletons: { gap: Spacing.three, paddingHorizontal: Spacing.three },
});

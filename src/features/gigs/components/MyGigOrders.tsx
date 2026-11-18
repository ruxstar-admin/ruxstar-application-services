import { useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ChoiceChips } from '@/components/ui/ChoiceChips';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { Brand, Spacing } from '@/constants/theme';
import { useAuthToken } from '@/hooks/use-auth-token';
import { usePaginated } from '@/hooks/use-paginated';
import { useRefetchOnFocus } from '@/hooks/use-refetch-on-focus';
import { GigsService } from '@/services/gigs-service';
import { GigOrderRow } from './GigOrderRow';

type Period = 'current' | 'past';
const VIEWS: { key: Period; label: string }[] = [
  { key: 'current', label: 'Current' },
  { key: 'past', label: 'Past' },
];

function Orders({ view }: { view: Period }) {
  const router = useRouter();
  const token = useAuthToken();
  const [now] = useState(Date.now);
  const list = usePaginated((cursor) => GigsService.orders(token, view, cursor));
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
          subtitle={item.freelancer.name}
          amount={item.price.total}
          now={now}
          onPress={() => router.push({ pathname: '/(customer)/gigs/order/[id]', params: { id: item.id } })}
        />
      )}
      refreshControl={<RefreshControl refreshing={list.refreshing} onRefresh={list.refresh} tintColor={Brand.primarySoft} />}
      contentContainerStyle={styles.list}
      onEndReached={list.loadMore}
      onEndReachedThreshold={0.5}
      ListEmptyComponent={
        view === 'current' ? (
          <EmptyState
            icon="briefcase-outline"
            title="No freelance orders going on"
            message="Gigs you order and offers you pay for show up here until they’re done."
            actionLabel="Find a freelancer"
            onAction={() => router.push({ pathname: '/(customer)/(tabs)/discover', params: { category: 'gigs' } })}
          />
        ) : (
          <EmptyState icon="briefcase-outline" title="Nothing here yet" message="Completed and cancelled freelance orders show up here." />
        )
      }
      ListFooterComponent={list.loadingMore ? <ActivityIndicator color={Brand.primarySoft} style={styles.footer} /> : null}
    />
  );
}

/** Your freelance orders: the ones going on, or the ones done with. */
export function MyGigOrders() {
  const [view, setView] = useState<Period>('current');
  return (
    <View style={styles.flex}>
      <View style={styles.chips}>
        <ChoiceChips options={VIEWS} value={view} onChange={setView} secondary />
      </View>
      <Orders key={view} view={view} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  chips: { paddingBottom: Spacing.two },
  list: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.five },
  footer: { paddingVertical: Spacing.three },
  skeletons: { gap: Spacing.three, paddingHorizontal: Spacing.three },
});

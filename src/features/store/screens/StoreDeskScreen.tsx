import { useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SegmentedTabs } from '@/components/ui/SegmentedTabs';
import { Skeleton } from '@/components/ui/Skeleton';
import { TextLink } from '@/components/ui/TextLink';
import { Brand, Spacing } from '@/constants/theme';
import { useAuthToken } from '@/hooks/use-auth-token';
import { usePaginated } from '@/hooks/use-paginated';
import { useRefetchOnFocus } from '@/hooks/use-refetch-on-focus';
import { StoreDeskService } from '@/services/store-service';
import type { DeskStoreOrdersView } from '@/types/store';
import { StoreOrderRow } from '../components/StoreOrderRow';
import { useDeskStore } from '../hooks/use-desk-store';

const VIEWS = [
  { key: 'open', label: 'To do' },
  { key: 'returns', label: 'Returns' },
  { key: 'done', label: 'Done' },
  { key: 'all', label: 'All' },
] as const;

const EMPTY: Record<DeskStoreOrdersView, { title: string; message?: string }> = {
  open: { title: 'Nothing to do', message: 'Paid orders waiting to be accepted, packed or delivered show up here.' },
  returns: { title: 'No returns', message: 'When a customer asks to return something, it shows up here.' },
  done: { title: 'Nothing finished yet' },
  all: { title: 'No orders yet', message: 'Orders customers place in the app show up here.' },
};

function Orders({ storeId, view }: { storeId: string; view: DeskStoreOrdersView }) {
  const router = useRouter();
  const token = useAuthToken();
  const list = usePaginated((cursor) => StoreDeskService.orders(token, storeId, view, cursor));
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
  if (list.error && !list.items.length) return <EmptyState icon="cloud-offline-outline" title="Could not load orders" actionLabel="Try again" onAction={list.retry} />;
  return (
    <FlatList
      data={list.items}
      keyExtractor={(o) => o.id}
      contentContainerStyle={styles.list}
      refreshControl={<RefreshControl refreshing={list.refreshing} onRefresh={list.refresh} tintColor={Brand.primarySoft} />}
      onEndReached={list.loadMore}
      onEndReachedThreshold={0.5}
      ListFooterComponent={list.loadingMore ? <ActivityIndicator color={Brand.primarySoft} style={styles.footer} /> : null}
      ListEmptyComponent={<EmptyState icon="bag-handle-outline" title={EMPTY[view].title} message={EMPTY[view].message} />}
      renderItem={({ item }) => (
        <StoreOrderRow
          order={item}
          subtitle={item.customer.name}
          amount={item.price.total}
          onPress={() => router.push({ pathname: '/(customer)/store-desk/order/[id]', params: { id: item.id } })}
        />
      )}
    />
  );
}

/** A shop's orders: to do (accept, pack, deliver), returns, done and all, with a link to products and stock. */
export function StoreDeskScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { store, can } = useDeskStore(id);
  const [view, setView] = useState<DeskStoreOrdersView>('open');
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <ScreenHeader title={store?.name ?? 'Shop orders'} onBack={() => router.back()} />
        {can('store.stock') ? <TextLink label="Products and stock" onPress={() => router.push({ pathname: '/(customer)/store-desk/[id]/products', params: { id } })} /> : null}
        <SegmentedTabs options={VIEWS} value={view} onChange={setView} />
      </View>
      <Orders key={view} storeId={id} view={view} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Brand.bg },
  header: { paddingHorizontal: Spacing.three, gap: Spacing.three, paddingBottom: Spacing.three },
  list: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.five, flexGrow: 1 },
  skeletons: { gap: Spacing.three, paddingHorizontal: Spacing.three },
  footer: { paddingVertical: Spacing.three },
});

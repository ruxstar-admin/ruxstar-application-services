import { useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SegmentedTabs } from '@/components/ui/SegmentedTabs';
import { Skeleton } from '@/components/ui/Skeleton';
import { Brand, Spacing } from '@/constants/theme';
import { OrderRow } from '@/features/pod/components/OrderRow';
import { STATUS_LABEL } from '@/features/pod/lib/order';
import { StoreOrderRow } from '@/features/store/components/StoreOrderRow';
import { useAuthToken } from '@/hooks/use-auth-token';
import { usePaginated } from '@/hooks/use-paginated';
import { useRefetchOnFocus } from '@/hooks/use-refetch-on-focus';
import { OrderService } from '@/services/order-service';
import { StoreService } from '@/services/store-service';

type Tab = 'print' | 'shops';
const TABS: { key: Tab; label: string }[] = [
  { key: 'print', label: 'Print' },
  { key: 'shops', label: 'Local shops' },
];

function Skeletons() {
  return (
    <View style={styles.skeletons}>
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} height={72} radius={18} />
      ))}
    </View>
  );
}

function PrintOrders() {
  const router = useRouter();
  const token = useAuthToken();
  const list = usePaginated((cursor) => OrderService.list(token, cursor));
  useRefetchOnFocus(list.refresh);

  if (list.loading) return <Skeletons />;
  if (list.error && list.items.length === 0) return <EmptyState icon="cloud-offline-outline" title="Could not load your orders" actionLabel="Try again" onAction={list.retry} />;
  return (
    <FlatList
      data={list.items}
      keyExtractor={(o) => o.id}
      renderItem={({ item }) => (
        <OrderRow
          order={item}
          subtitle={item.shop.name}
          amount={item.price.total}
          statusLabel={STATUS_LABEL}
          onPress={() => router.push({ pathname: '/(customer)/pod/order/[id]', params: { id: item.id } })}
        />
      )}
      refreshControl={<RefreshControl refreshing={list.refreshing} onRefresh={list.refresh} tintColor={Brand.primarySoft} />}
      contentContainerStyle={styles.list}
      onEndReached={list.loadMore}
      onEndReachedThreshold={0.5}
      ListEmptyComponent={
        <EmptyState
          icon="receipt-outline"
          title="No print orders yet"
          message="Print orders you place show up here, with where each one is."
          actionLabel="Find a print shop"
          onAction={() => router.push('/(customer)/(tabs)/discover')}
        />
      }
      ListFooterComponent={list.loadingMore ? <ActivityIndicator color={Brand.primarySoft} style={styles.footer} /> : null}
    />
  );
}

function ShopOrders() {
  const router = useRouter();
  const token = useAuthToken();
  const list = usePaginated((cursor) => StoreService.orders(token, 'all', cursor));
  useRefetchOnFocus(list.refresh);

  if (list.loading) return <Skeletons />;
  if (list.error && list.items.length === 0) return <EmptyState icon="cloud-offline-outline" title="Could not load your orders" actionLabel="Try again" onAction={list.retry} />;
  return (
    <FlatList
      data={list.items}
      keyExtractor={(o) => o.id}
      renderItem={({ item }) => (
        <StoreOrderRow
          order={item}
          subtitle={item.business.name}
          amount={item.price.total}
          onPress={() => router.push({ pathname: '/(customer)/store/order/[id]', params: { id: item.id } })}
        />
      )}
      refreshControl={<RefreshControl refreshing={list.refreshing} onRefresh={list.refresh} tintColor={Brand.primarySoft} />}
      contentContainerStyle={styles.list}
      onEndReached={list.loadMore}
      onEndReachedThreshold={0.5}
      ListEmptyComponent={
        <EmptyState
          icon="bag-handle-outline"
          title="No shop orders yet"
          message="Orders from local shops show up here, with where each one is."
          actionLabel="Find local shops"
          onAction={() => router.push({ pathname: '/(customer)/(tabs)/discover', params: { category: 'shop' } })}
        />
      }
      ListFooterComponent={list.loadingMore ? <ActivityIndicator color={Brand.primarySoft} style={styles.footer} /> : null}
    />
  );
}

/** Your print and local shop orders, newest first. Tickets, classes, slots and stays have their own lists. */
export function MyOrdersScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ tab?: string }>();
  const [tab, setTab] = useState<Tab>(params.tab === 'shops' ? 'shops' : 'print');

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <ScreenHeader title="Your orders" onBack={() => router.back()} />
        <SegmentedTabs options={TABS} value={tab} onChange={setTab} />
      </View>
      {tab === 'print' ? <PrintOrders /> : <ShopOrders />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Brand.bg },
  header: { paddingHorizontal: Spacing.three, gap: Spacing.two, paddingBottom: Spacing.two },
  list: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.five },
  footer: { paddingVertical: Spacing.three },
  skeletons: { gap: Spacing.three, paddingHorizontal: Spacing.three },
});

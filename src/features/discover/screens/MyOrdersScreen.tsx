import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { Brand, Spacing } from '@/constants/theme';
import { OrderRow } from '@/features/pod/components/OrderRow';
import { STATUS_LABEL } from '@/features/pod/lib/order';
import { useAuthToken } from '@/hooks/use-auth-token';
import { usePaginated } from '@/hooks/use-paginated';
import { useRefetchOnFocus } from '@/hooks/use-refetch-on-focus';
import { OrderService } from '@/services/order-service';

/** Your print orders, newest first. Tickets, classes and stays join this list as those modules open. */
export function MyOrdersScreen() {
  const router = useRouter();
  const token = useAuthToken();
  const list = usePaginated((cursor) => OrderService.list(token, cursor));
  useRefetchOnFocus(list.refresh);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <ScreenHeader title="Your orders" onBack={() => router.back()} />
      </View>
      {list.loading ? (
        <View style={styles.skeletons}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} height={72} radius={18} />
          ))}
        </View>
      ) : list.error && list.items.length === 0 ? (
        <EmptyState icon="cloud-offline-outline" title="Could not load your orders" actionLabel="Try again" onAction={list.retry} />
      ) : (
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
              title="No orders yet"
              message="Print orders you place show up here, with where each one is."
              actionLabel="Find a print shop"
              onAction={() => router.push('/(customer)/(tabs)/discover')}
            />
          }
          ListFooterComponent={list.loadingMore ? <ActivityIndicator color={Brand.primarySoft} style={styles.footer} /> : null}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Brand.bg },
  header: { paddingHorizontal: Spacing.three },
  list: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.five },
  footer: { paddingVertical: Spacing.three },
  skeletons: { gap: Spacing.three, paddingHorizontal: Spacing.three },
});

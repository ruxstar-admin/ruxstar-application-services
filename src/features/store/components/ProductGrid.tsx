import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Skeleton } from '@/components/ui/Skeleton';
import { Spacing } from '@/constants/theme';
import { useAuthToken } from '@/hooks/use-auth-token';
import { usePaginated } from '@/hooks/use-paginated';
import { StoreService } from '@/services/store-service';
import type { ProductsQuery } from '@/types/store';
import { ProductTile } from './ProductTile';

const COLUMNS = 2;

/** A shop's products, two to a row, 20 at a time with "Show more products". Remount with a `key` when the query changes. */
export function ProductGrid({ query, searching }: { query: ProductsQuery; searching: boolean }) {
  const router = useRouter();
  const token = useAuthToken();
  const { width } = useWindowDimensions();
  const tile = Math.floor((width - Spacing.three * 2 - Spacing.two * (COLUMNS - 1)) / COLUMNS);
  const list = usePaginated((cursor) => StoreService.products(token, query, cursor));

  if (list.loading) {
    return (
      <View style={styles.grid}>
        {[0, 1, 2, 3].map((i) => (
          <View key={i} style={{ width: tile, gap: Spacing.one }}>
            <Skeleton height={tile} radius={16} />
            <Skeleton height={14} width="70%" />
          </View>
        ))}
      </View>
    );
  }
  if (list.error && !list.items.length) return <ErrorBanner message="Could not load the products." onRetry={list.retry} />;
  if (!list.items.length) {
    return (
      <EmptyState
        icon="bag-handle-outline"
        title={searching ? 'Nothing matches' : 'No products yet'}
        message={searching ? 'Try another word.' : 'This shop hasn’t put anything on sale yet. Check back soon.'}
      />
    );
  }
  return (
    <>
      <View style={styles.grid}>
        {list.items.map((p) => (
          <ProductTile key={p.id} product={p} width={tile} onPress={() => router.push({ pathname: '/(customer)/store/product/[id]', params: { id: p.id } })} />
        ))}
      </View>
      {list.moreFailed ? <ErrorBanner message="Could not load more products." onRetry={list.loadMore} /> : null}
      {list.hasMore && !list.moreFailed ? <PrimaryButton label="Show more products" variant="outline" onPress={list.loadMore} loading={list.loadingMore} /> : null}
    </>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
});

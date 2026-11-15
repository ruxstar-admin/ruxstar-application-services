import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChoiceChips } from '@/components/ui/ChoiceChips';
import { EmptyState } from '@/components/ui/EmptyState';
import { InputField } from '@/components/ui/InputField';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { Brand, Spacing } from '@/constants/theme';
import { useAuthToken } from '@/hooks/use-auth-token';
import { usePaginated } from '@/hooks/use-paginated';
import { useRefetchOnFocus } from '@/hooks/use-refetch-on-focus';
import { StoreDeskService } from '@/services/store-service';
import type { VendorProductsQuery } from '@/types/store';
import { StockRow } from '../components/StockRow';
import { useDeskStore } from '../hooks/use-desk-store';
import { rememberProducts } from '../lib/desk-products';

type Filter = 'all' | 'live' | 'hidden' | 'low' | 'removed';
const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'live', label: 'On sale' },
  { key: 'hidden', label: 'Off sale' },
  { key: 'low', label: 'Low stock' },
  { key: 'removed', label: 'Taken down' },
];
const LOW_STOCK = 3;
const SEARCH_DELAY_MS = 350;

const queryOf = (filter: Filter, q: string): VendorProductsQuery => ({
  ...(filter === 'low' ? { lowStock: LOW_STOCK } : filter === 'all' ? {} : { status: filter }),
  ...(q ? { q } : {}),
});

function Products({ storeId, query, canEdit }: { storeId: string; query: VendorProductsQuery; canEdit: boolean }) {
  const router = useRouter();
  const token = useAuthToken();
  const list = usePaginated((cursor) => StoreDeskService.products(token, storeId, query, cursor));
  useRefetchOnFocus(list.refresh);

  if (list.loading) {
    return (
      <View style={styles.skeletons}>
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} height={88} radius={18} />
        ))}
      </View>
    );
  }
  if (list.error && !list.items.length) return <EmptyState icon="cloud-offline-outline" title="Could not load products" actionLabel="Try again" onAction={list.retry} />;
  return (
    <FlatList
      data={list.items}
      keyExtractor={(p) => p.id}
      contentContainerStyle={styles.list}
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={list.refreshing} onRefresh={list.refresh} tintColor={Brand.primarySoft} />}
      onEndReached={list.loadMore}
      onEndReachedThreshold={0.5}
      ListFooterComponent={list.loadingMore ? <ActivityIndicator color={Brand.primarySoft} style={styles.footer} /> : null}
      ListEmptyComponent={
        <EmptyState
          icon="pricetags-outline"
          title={query.q || query.status || query.lowStock ? 'Nothing here' : 'No products yet'}
          message={query.q || query.status || query.lowStock ? 'Try another filter or word.' : 'Products the shop adds show up here with their stock.'}
        />
      }
      renderItem={({ item }) => (
        <StockRow
          product={item}
          onOpen={
            canEdit
              ? () => {
                  rememberProducts([item]);
                  router.push({ pathname: '/(customer)/store-desk/[id]/product', params: { id: storeId, product: item.id } });
                }
              : undefined
          }
          onSaved={(next) => list.setItems((now) => now.map((p) => (p.id === next.id ? next : p)))}
        />
      )}
    />
  );
}

/** A shop's products with their stock: filter, search, update stock in place, and for the owner, add products. */
export function DeskProductsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { store, can } = useDeskStore(id);
  const [filter, setFilter] = useState<Filter>('all');
  const [text, setText] = useState('');
  const [q, setQ] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setQ(text.trim()), SEARCH_DELAY_MS);
    return () => clearTimeout(t);
  }, [text]);
  const query = queryOf(filter, q);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <ScreenHeader title="Products and stock" onBack={() => router.back()} />
        {store?.owner ? <PrimaryButton label="Add a product" onPress={() => router.push({ pathname: '/(customer)/store-desk/[id]/product', params: { id } })} /> : null}
        <InputField value={text} onChangeText={setText} placeholder="Search products" autoCorrect={false} returnKeyType="search" accessibilityLabel="Search products" />
      </View>
      <View style={styles.chips}>
        <ChoiceChips options={FILTERS} value={filter} onChange={setFilter} />
      </View>
      <Products key={JSON.stringify(query)} storeId={id} query={query} canEdit={can('store.products')} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Brand.bg },
  header: { paddingHorizontal: Spacing.three, gap: Spacing.two },
  chips: { paddingVertical: Spacing.two },
  list: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.five, flexGrow: 1 },
  skeletons: { gap: Spacing.two, paddingHorizontal: Spacing.three },
  footer: { paddingVertical: Spacing.three },
});

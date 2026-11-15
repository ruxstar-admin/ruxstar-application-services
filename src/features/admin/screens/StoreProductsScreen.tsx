import { useEffect, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { InputField } from '@/components/ui/InputField';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SegmentedTabs } from '@/components/ui/SegmentedTabs';
import { Skeleton } from '@/components/ui/Skeleton';
import { Brand, Spacing } from '@/constants/theme';
import { PRODUCT_STATUS } from '@/features/store/lib/store';
import { money } from '@/features/vendor/lib/pod';
import { useAuthToken } from '@/hooks/use-auth-token';
import { usePaginated } from '@/hooks/use-paginated';
import { ConsoleStoreService } from '@/services/store-service';
import type { ConsoleProduct, ConsoleProductsQuery, ProductStatus } from '@/types/store';
import { Card, ListFooter, Row, consoleStyles, errorText } from '../components/parts';

const STATUSES = [
  { key: 'all', label: 'All' },
  { key: 'live', label: 'On sale' },
  { key: 'hidden', label: 'Off sale' },
  { key: 'removed', label: 'Taken down' },
] as const satisfies readonly { key: ProductStatus | 'all'; label: string }[];

const SEARCH_DELAY_MS = 350;

const summary = (p: ConsoleProduct) => [p.business.name, p.city, `${p.variants.length > 1 ? 'from ' : ''}${money(p.priceFrom)}`, p.inStock ? null : 'sold out'].filter(Boolean).join(' · ');

function Results({ query }: { query: ConsoleProductsQuery }) {
  const router = useRouter();
  const token = useAuthToken();
  const list = usePaginated((cursor) => ConsoleStoreService.products(token, query, cursor));

  if (list.loading) {
    return (
      <View style={consoleStyles.skeletons}>
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} height={68} radius={14} />
        ))}
      </View>
    );
  }
  if (list.error && list.items.length === 0) {
    return <EmptyState icon="cloud-offline-outline" title="Could not load products" message={errorText(list.error)} actionLabel="Try again" onAction={list.retry} />;
  }
  return (
    <FlatList
      data={list.items}
      keyExtractor={(p) => p.id}
      contentContainerStyle={consoleStyles.list}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      refreshControl={<RefreshControl refreshing={list.refreshing} onRefresh={list.refresh} tintColor={Brand.primarySoft} />}
      onEndReached={list.loadMore}
      onEndReachedThreshold={0.5}
      ListEmptyComponent={<EmptyState icon="pricetags-outline" title="No products here" message="Try another filter or word." />}
      ListFooterComponent={<ListFooter list={list} />}
      renderItem={({ item: p }) => (
        <Card>
          <Row
            name={p.title}
            avatarUrl={p.photo?.url}
            title={p.title}
            subtitle={summary(p)}
            right={<Badge {...PRODUCT_STATUS[p.status]} />}
            onPress={() => router.push({ pathname: '/(admin)/store-product/[id]', params: { id: p.id } })}
          />
        </Card>
      )}
    />
  );
}

/** Every local shop product, or one shop's, by status and words; each opens to be taken down. */
export function StoreProductsScreen() {
  const router = useRouter();
  const { shop, label } = useLocalSearchParams<{ shop?: string; label?: string }>();
  const [text, setText] = useState('');
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<ProductStatus | 'all'>('all');
  useEffect(() => {
    const t = setTimeout(() => setQ(text.trim()), SEARCH_DELAY_MS);
    return () => clearTimeout(t);
  }, [text]);
  const query: ConsoleProductsQuery = { ...(shop ? { shop } : {}), ...(q ? { q } : {}), ...(status === 'all' ? {} : { status }) };

  return (
    <SafeAreaView style={styles.container}>
      <View style={consoleStyles.pad}>
        <ScreenHeader title={label ? `${label}: products` : 'Shop products'} onBack={() => router.back()} />
      </View>
      <View style={styles.controls}>
        <InputField value={text} onChangeText={setText} placeholder="Product name" autoCorrect={false} returnKeyType="search" maxLength={60} accessibilityLabel="Search products" />
        <SegmentedTabs options={STATUSES} value={status} onChange={setStatus} />
      </View>
      <Results key={JSON.stringify(query)} query={query} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Brand.bg },
  controls: { gap: Spacing.two, paddingHorizontal: Spacing.three, paddingBottom: Spacing.two },
});

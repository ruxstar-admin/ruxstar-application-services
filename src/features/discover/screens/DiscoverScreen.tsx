import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChoiceChips } from '@/components/ui/ChoiceChips';
import { EmptyState } from '@/components/ui/EmptyState';
import { InputField } from '@/components/ui/InputField';
import { Skeleton } from '@/components/ui/Skeleton';
import { Brand, Spacing, Typography } from '@/constants/theme';
import { ShopCardView } from '@/features/pod/components/ShopCardView';
import { useBusinessCatalog } from '@/features/vendor/hooks/use-business-catalog';
import { useAuthToken } from '@/hooks/use-auth-token';
import { usePaginated } from '@/hooks/use-paginated';
import { ShopService } from '@/services/shop-service';
import type { PodProduct } from '@/types/business';
import type { ShopFilters } from '@/types/shop';

/** Waits this long after the last keystroke before searching. */
const SEARCH_DELAY_MS = 350;

type Filter = 'all' | PodProduct;

function Results({ filters }: { filters: ShopFilters }) {
  const router = useRouter();
  const token = useAuthToken();
  const list = usePaginated((cursor) => ShopService.list(token, filters, cursor));

  if (list.loading) {
    return (
      <View style={styles.skeletons}>
        {[0, 1].map((i) => (
          <View key={i} style={styles.skeletonCard}>
            <Skeleton height={190} radius={18} />
            <Skeleton height={16} width="60%" />
            <Skeleton height={12} width="40%" />
          </View>
        ))}
      </View>
    );
  }
  if (list.error && list.items.length === 0) {
    return <EmptyState icon="cloud-offline-outline" title="Could not load shops" message="Check your connection and try again." actionLabel="Try again" onAction={list.retry} />;
  }

  const searching = Boolean(filters.q || filters.product);
  return (
    <FlatList
      data={list.items}
      keyExtractor={(s) => s.id}
      contentContainerStyle={styles.list}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      refreshControl={<RefreshControl refreshing={list.refreshing} onRefresh={list.refresh} tintColor={Brand.primarySoft} />}
      onEndReached={list.loadMore}
      onEndReachedThreshold={0.5}
      ListEmptyComponent={
        <EmptyState
          icon="print-outline"
          title={searching ? 'No shops match' : 'No print shops yet'}
          message={searching ? 'Try another product or name.' : 'Print shops on Ruxstar show up here as soon as they open.'}
        />
      }
      ListFooterComponent={list.loadingMore ? <ActivityIndicator color={Brand.primarySoft} style={styles.footer} /> : null}
      renderItem={({ item }) => <ShopCardView shop={item} onPress={() => router.push({ pathname: '/(customer)/pod/shop/[id]', params: { id: item.id } })} />}
    />
  );
}

/** Print shops customers can order from, searchable and filtered by what they print. */
export function DiscoverScreen() {
  const catalog = useBusinessCatalog();
  const [text, setText] = useState('');
  const [q, setQ] = useState('');
  const [product, setProduct] = useState<Filter>('all');

  useEffect(() => {
    const t = setTimeout(() => setQ(text.trim()), SEARCH_DELAY_MS);
    return () => clearTimeout(t);
  }, [text]);

  const chips: { key: Filter; label: string }[] = [{ key: 'all', label: 'All' }, ...(catalog.data?.podProducts ?? []).map((p) => ({ key: p.id, label: p.label }))];
  const filters: ShopFilters = { ...(q ? { q } : {}), ...(product === 'all' ? {} : { product }) };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.heading}>Discover</Text>
        <Text style={styles.subheading}>Print shops on Ruxstar</Text>
      </View>
      <View style={styles.search}>
        <InputField value={text} onChangeText={setText} placeholder="Search shops" autoCorrect={false} returnKeyType="search" accessibilityLabel="Search shops" />
      </View>
      <ChoiceChips options={chips} value={product} onChange={setProduct} />
      <Results key={`${q}|${product}`} filters={filters} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Brand.bg, gap: Spacing.three },
  header: { paddingHorizontal: Spacing.three, paddingTop: Spacing.three, gap: 2 },
  heading: { ...Typography.title, color: Brand.text },
  subheading: { ...Typography.caption, color: Brand.textMuted },
  search: { paddingHorizontal: Spacing.three },
  list: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.five, gap: Spacing.three, flexGrow: 1 },
  skeletons: { paddingHorizontal: Spacing.three, gap: Spacing.four },
  skeletonCard: { gap: Spacing.two },
  footer: { paddingVertical: Spacing.three },
});

import { useEffect, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { InputField } from '@/components/ui/InputField';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { TextLink } from '@/components/ui/TextLink';
import { Brand, Spacing } from '@/constants/theme';
import { storeTypeLabel } from '@/features/store/lib/store';
import { useAuthToken } from '@/hooks/use-auth-token';
import { usePaginated } from '@/hooks/use-paginated';
import { ConsoleStoreService } from '@/services/store-service';
import type { ConsoleStore, ConsoleStoresQuery } from '@/types/store';
import { useCan } from '../access';
import { Card, ListFooter, Row, consoleStyles, errorText } from '../components/parts';

/** Waits this long after the last keystroke before filtering. */
const SEARCH_DELAY_MS = 350;

const summary = (s: ConsoleStore) =>
  [storeTypeLabel(s.type), [s.area, s.city].filter(Boolean).join(', '), `${s.products} product${s.products === 1 ? '' : 's'}`, `${s.orders} order${s.orders === 1 ? '' : 's'}`].join(' · ');

export const storeBadge = (s: Pick<ConsoleStore, 'status' | 'suspended' | 'open'>) =>
  s.suspended
    ? ({ label: 'On hold', tone: 'error' } as const)
    : s.status === 'live'
      ? s.open
        ? ({ label: 'Open', tone: 'success' } as const)
        : ({ label: 'Closed', tone: 'neutral' } as const)
      : ({ label: 'Draft', tone: 'neutral' } as const);

function Results({ query }: { query: ConsoleStoresQuery }) {
  const router = useRouter();
  const token = useAuthToken();
  const list = usePaginated((cursor) => ConsoleStoreService.stores(token, query, cursor));

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
    return <EmptyState icon="cloud-offline-outline" title="Could not load shops" message={errorText(list.error)} actionLabel="Try again" onAction={list.retry} />;
  }
  return (
    <FlatList
      data={list.items}
      keyExtractor={(s) => s.id}
      contentContainerStyle={consoleStyles.list}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      refreshControl={<RefreshControl refreshing={list.refreshing} onRefresh={list.refresh} tintColor={Brand.primarySoft} />}
      onEndReached={list.loadMore}
      onEndReachedThreshold={0.5}
      ListEmptyComponent={<EmptyState icon="bag-handle-outline" title="No shops here" message={query.city || query.q ? 'Try another city or name.' : 'Local shops owners add show up here.'} />}
      ListFooterComponent={<ListFooter list={list} />}
      renderItem={({ item: s }) => (
        <Card>
          <Row
            name={s.name}
            avatarUrl={s.photoUrl}
            title={s.name}
            subtitle={summary(s)}
            right={<Badge {...storeBadge(s)} />}
            onPress={() => router.push({ pathname: '/(admin)/store/[id]', params: { id: s.id } })}
          />
        </Card>
      )}
    />
  );
}

/** Every local shop, newest first, by city or name. */
export function StoresScreen() {
  const router = useRouter();
  const canOrders = useCan('orders.view');
  const [cityText, setCityText] = useState('');
  const [nameText, setNameText] = useState('');
  const [query, setQuery] = useState<ConsoleStoresQuery>({});

  useEffect(() => {
    const t = setTimeout(() => setQuery({ ...(cityText.trim() ? { city: cityText.trim() } : {}), ...(nameText.trim() ? { q: nameText.trim() } : {}) }), SEARCH_DELAY_MS);
    return () => clearTimeout(t);
  }, [cityText, nameText]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={consoleStyles.pad}>
        <ScreenHeader title="Local shops" onBack={() => router.back()} />
      </View>
      <View style={styles.controls}>
        <View style={styles.pair}>
          <View style={styles.flex}>
            <InputField value={nameText} onChangeText={setNameText} placeholder="Shop name" autoCorrect={false} returnKeyType="search" maxLength={60} accessibilityLabel="Search by shop name" />
          </View>
          <View style={styles.flex}>
            <InputField value={cityText} onChangeText={setCityText} placeholder="City" autoCapitalize="words" autoCorrect={false} returnKeyType="search" maxLength={60} accessibilityLabel="Filter by city" />
          </View>
        </View>
        <View style={styles.links}>
          <TextLink label="Products" onPress={() => router.push('/(admin)/store-products')} />
          {canOrders ? <TextLink label="Shop orders" onPress={() => router.push('/(admin)/store-orders')} /> : null}
          <TextLink label="Banned categories" onPress={() => router.push('/(admin)/banned')} />
        </View>
      </View>
      <Results key={JSON.stringify(query)} query={query} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Brand.bg },
  controls: { gap: Spacing.two, paddingHorizontal: Spacing.three, paddingBottom: Spacing.two },
  pair: { flexDirection: 'row', gap: Spacing.two },
  flex: { flex: 1 },
  links: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.four },
});

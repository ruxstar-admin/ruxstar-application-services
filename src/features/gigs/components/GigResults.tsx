import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Dropdown, DropdownRow } from '@/components/ui/Dropdown';
import { EmptyState } from '@/components/ui/EmptyState';
import { InputField } from '@/components/ui/InputField';
import { Skeleton } from '@/components/ui/Skeleton';
import { Brand, Spacing } from '@/constants/theme';
import { BarButton } from '@/features/store/components/StoreResults';
import { useAuthToken } from '@/hooks/use-auth-token';
import { usePaginated } from '@/hooks/use-paginated';
import { GigsService } from '@/services/gigs-service';
import type { GigCategoryOption, GigsQuery } from '@/types/gigs';
import { GigCardView } from './GigCardView';

/** Waits this long after the last keystroke before filtering by city. */
const CITY_DELAY_MS = 350;

function Cards({ query, filtered }: { query: GigsQuery; filtered: boolean }) {
  const router = useRouter();
  const token = useAuthToken();
  const list = usePaginated((cursor) => GigsService.list(token, query, cursor));

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
  if (list.error && !list.items.length) {
    return <EmptyState icon="cloud-offline-outline" title="Could not load gigs" message="Check your connection and try again." actionLabel="Try again" onAction={list.retry} />;
  }
  return (
    <FlatList
      data={list.items}
      keyExtractor={(g) => g.id}
      contentContainerStyle={styles.list}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      refreshControl={<RefreshControl refreshing={list.refreshing} onRefresh={list.refresh} tintColor={Brand.primarySoft} />}
      onEndReached={list.loadMore}
      onEndReachedThreshold={0.5}
      initialNumToRender={4}
      windowSize={7}
      ListEmptyComponent={
        <EmptyState
          icon="briefcase-outline"
          title={filtered ? 'No gigs match' : 'No gigs yet'}
          message={filtered ? 'Try another category, city or word.' : 'Designers, editors, writers and more show their packages here as soon as they start.'}
        />
      }
      ListFooterComponent={list.loadingMore ? <ActivityIndicator color={Brand.primarySoft} style={styles.footer} /> : null}
      renderItem={({ item }) => <GigCardView gig={item} onPress={() => router.push({ pathname: '/(customer)/gigs/[id]', params: { id: item.id } })} />}
    />
  );
}

/** Freelancers' gigs for Discover: a category, a city and your freelance orders. The search box matches titles and names. */
export function GigResults({ q, categories }: { q: string; categories: readonly GigCategoryOption[] }) {
  const router = useRouter();
  const [category, setCategory] = useState('all');
  const [cityText, setCityText] = useState('');
  const [city, setCity] = useState('');
  const options = [{ key: 'all', label: 'Every category' }, ...categories];

  useEffect(() => {
    const t = setTimeout(() => setCity(cityText.trim()), CITY_DELAY_MS);
    return () => clearTimeout(t);
  }, [cityText]);

  const query: GigsQuery = { ...(q ? { q } : {}), ...(city.length >= 2 ? { city } : {}), ...(category !== 'all' ? { category } : {}) };

  return (
    <>
      <DropdownRow>
        <Dropdown title="Category" options={options} value={category} onChange={setCategory} />
      </DropdownRow>
      <View style={styles.bar}>
        <View style={styles.city}>
          <InputField value={cityText} onChangeText={setCityText} placeholder="Any city" autoCorrect={false} accessibilityLabel="City" />
        </View>
        <BarButton icon="receipt-outline" label="Orders" spoken="Your freelance orders" onPress={() => router.push({ pathname: '/(customer)/orders', params: { tab: 'freelance' } })} />
      </View>
      <Cards key={JSON.stringify(query)} query={query} filtered={Object.keys(query).length > 0} />
    </>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingHorizontal: Spacing.three },
  city: { flex: 1 },
  list: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.five, gap: Spacing.three, flexGrow: 1 },
  skeletons: { paddingHorizontal: Spacing.three, gap: Spacing.four },
  skeletonCard: { gap: Spacing.two },
  footer: { paddingVertical: Spacing.three },
});

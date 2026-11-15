import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Dropdown } from '@/components/ui/Dropdown';
import { EmptyState } from '@/components/ui/EmptyState';
import { InputField } from '@/components/ui/InputField';
import { Skeleton } from '@/components/ui/Skeleton';
import { Brand, Spacing } from '@/constants/theme';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { useAuthToken } from '@/hooks/use-auth-token';
import { usePaginated } from '@/hooks/use-paginated';
import { TurfService } from '@/services/turf-service';
import type { GroundFilters } from '@/types/turf';
import { GroundCardView } from './GroundCardView';

/** Waits this long after the last keystroke before filtering by city. */
const CITY_DELAY_MS = 350;

function Cards({ filters }: { filters: GroundFilters }) {
  const router = useRouter();
  const token = useAuthToken();
  const list = usePaginated((cursor) => TurfService.list(token, filters, cursor));

  if (list.loading) {
    return (
      <View style={styles.skeletons}>
        {[0, 1].map((i) => (
          <View key={i} style={styles.skeletonCard}>
            <Skeleton height={190} radius={18} />
            <Skeleton height={16} width="65%" />
            <Skeleton height={12} width="40%" />
          </View>
        ))}
      </View>
    );
  }
  if (list.error && !list.items.length) {
    return <EmptyState icon="cloud-offline-outline" title="Could not load grounds" message="Check your connection and try again." actionLabel="Try again" onAction={list.retry} />;
  }
  const searching = Boolean(filters.q || filters.sport || filters.city);
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
          icon="football-outline"
          title={searching ? 'No grounds match' : 'No grounds yet'}
          message={searching ? 'Try another sport or city.' : 'Turfs, courts and nets show up here as soon as they open for bookings.'}
        />
      }
      ListFooterComponent={list.loadingMore ? <ActivityIndicator color={Brand.primarySoft} style={styles.footer} /> : null}
      renderItem={({ item }) => <GroundCardView ground={item} onPress={() => router.push({ pathname: '/(customer)/turf/[id]', params: { id: item.id } })} />}
    />
  );
}

/** Grounds taking bookings, for Discover: by sport from Ruxstar's list and by city; the search box matches names. */
export function GroundResults({ q }: { q: string }) {
  const token = useAuthToken();
  const sports = useAsyncResource(() => TurfService.sports(token), 'turf-sports');
  const [sport, setSport] = useState('all');
  const [cityText, setCityText] = useState('');
  const [city, setCity] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setCity(cityText.trim()), CITY_DELAY_MS);
    return () => clearTimeout(t);
  }, [cityText]);

  const chips = [{ key: 'all', label: 'All sports' }, ...(sports.data ?? []).map((s) => ({ key: s.key, label: s.name }))];
  const filters: GroundFilters = { ...(q ? { q } : {}), ...(sport !== 'all' ? { sport } : {}), ...(city ? { city } : {}) };
  return (
    <>
      <View style={styles.bar}>
        <View style={styles.city}>
          <InputField value={cityText} onChangeText={setCityText} placeholder="Any city" autoCorrect={false} accessibilityLabel="City" />
        </View>
        <Dropdown title="Sport" options={chips} value={sport} onChange={setSport} />
      </View>
      <Cards key={`${q}|${sport}|${city}`} filters={filters} />
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

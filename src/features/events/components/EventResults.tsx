import { useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ChoiceChips } from '@/components/ui/ChoiceChips';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { Brand, Spacing } from '@/constants/theme';
import { useAuthToken } from '@/hooks/use-auth-token';
import { usePaginated } from '@/hooks/use-paginated';
import { EventsService } from '@/services/events-service';
import type { EventFilters, EventKind } from '@/types/events';
import { KINDS, KIND_LABEL } from '../lib/events';
import { EventCardView } from './EventCardView';

type Kind = 'all' | EventKind;
const KIND_CHIPS: { key: Kind; label: string }[] = [{ key: 'all', label: 'All events' }, ...KINDS.map((k) => ({ key: k, label: KIND_LABEL[k] }))];

function Cards({ filters }: { filters: EventFilters }) {
  const router = useRouter();
  const token = useAuthToken();
  const list = usePaginated((cursor) => EventsService.list(token, filters, cursor));

  if (list.loading) {
    return (
      <View style={styles.skeletons}>
        {[0, 1].map((i) => (
          <View key={i} style={styles.skeletonCard}>
            <Skeleton height={190} radius={18} />
            <Skeleton height={16} width="70%" />
            <Skeleton height={12} width="45%" />
          </View>
        ))}
      </View>
    );
  }
  if (list.error && !list.items.length) {
    return <EmptyState icon="cloud-offline-outline" title="Could not load events" message="Check your connection and try again." actionLabel="Try again" onAction={list.retry} />;
  }
  const searching = Boolean(filters.q || filters.kind);
  return (
    <FlatList
      data={list.items}
      keyExtractor={(e) => e.id}
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
          icon="calendar-outline"
          title={searching ? 'No events match' : 'No events coming up'}
          message={searching ? 'Try another kind or name.' : 'Concerts, matches and meetups on Ruxstar show up here as soon as they go on sale.'}
        />
      }
      ListFooterComponent={list.loadingMore ? <ActivityIndicator color={Brand.primarySoft} style={styles.footer} /> : null}
      renderItem={({ item }) => <EventCardView event={item} onPress={() => router.push({ pathname: '/(customer)/events/[id]', params: { id: item.id } })} />}
    />
  );
}

/** What's on, soonest first, for Discover: filter by kind; the search box matches titles and organisers. */
export function EventResults({ q }: { q: string }) {
  const [kind, setKind] = useState<Kind>('all');
  const filters: EventFilters = { ...(q ? { q } : {}), ...(kind !== 'all' ? { kind } : {}) };
  return (
    <>
      <ChoiceChips options={KIND_CHIPS} value={kind} onChange={setKind} secondary />
      <Cards key={`${q}|${kind}`} filters={filters} />
    </>
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.five, gap: Spacing.three, flexGrow: 1 },
  skeletons: { paddingHorizontal: Spacing.three, gap: Spacing.four },
  skeletonCard: { gap: Spacing.two },
  footer: { paddingVertical: Spacing.three },
});

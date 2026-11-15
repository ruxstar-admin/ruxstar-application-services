import { useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ChoiceChips } from '@/components/ui/ChoiceChips';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { Brand, Spacing } from '@/constants/theme';
import { useAuthToken } from '@/hooks/use-auth-token';
import { usePaginated } from '@/hooks/use-paginated';
import { CoachingService } from '@/services/coaching-service';
import type { CourseCategory, CourseFilters } from '@/types/coaching';
import { CATEGORIES, CATEGORY_LABEL } from '../lib/coaching';
import { CourseCardView } from './CourseCardView';

type Where = 'all' | 'offline' | 'online';
const WHERE_CHIPS: { key: Where; label: string }[] = [
  { key: 'all', label: 'In person & online' },
  { key: 'offline', label: 'In person' },
  { key: 'online', label: 'Online' },
];
type Category = 'all' | CourseCategory;
const CATEGORY_CHIPS: { key: Category; label: string }[] = [{ key: 'all', label: 'All subjects' }, ...CATEGORIES.map((c) => ({ key: c, label: CATEGORY_LABEL[c] }))];

function Cards({ filters }: { filters: CourseFilters }) {
  const router = useRouter();
  const token = useAuthToken();
  const list = usePaginated((cursor) => CoachingService.list(token, filters, cursor));

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
    return <EmptyState icon="cloud-offline-outline" title="Could not load courses" message="Check your connection and try again." actionLabel="Try again" onAction={list.retry} />;
  }
  const searching = Boolean(filters.q || filters.category || filters.online !== undefined);
  return (
    <FlatList
      data={list.items}
      keyExtractor={(c) => c.id}
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
          icon="school-outline"
          title={searching ? 'No courses match' : 'No courses yet'}
          message={searching ? 'Try another subject, or both in person and online.' : 'Tuition, music, dance and more show up here as soon as institutes open batches.'}
        />
      }
      ListFooterComponent={list.loadingMore ? <ActivityIndicator color={Brand.primarySoft} style={styles.footer} /> : null}
      renderItem={({ item }) => <CourseCardView course={item} onPress={() => router.push({ pathname: '/(customer)/coaching/[id]', params: { id: item.id } })} />}
    />
  );
}

/** Courses taking students, for Discover: in person or online, and by subject; the search box matches titles and institutes. */
export function CourseResults({ q }: { q: string }) {
  const [where, setWhere] = useState<Where>('all');
  const [category, setCategory] = useState<Category>('all');
  const filters: CourseFilters = {
    ...(q ? { q } : {}),
    ...(where !== 'all' ? { online: where === 'online' } : {}),
    ...(category !== 'all' ? { category } : {}),
  };
  return (
    <>
      <ChoiceChips options={WHERE_CHIPS} value={where} onChange={setWhere} secondary />
      <ChoiceChips options={CATEGORY_CHIPS} value={category} onChange={setCategory} secondary />
      <Cards key={`${q}|${where}|${category}`} filters={filters} />
    </>
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.five, gap: Spacing.three, flexGrow: 1 },
  skeletons: { paddingHorizontal: Spacing.three, gap: Spacing.four },
  skeletonCard: { gap: Spacing.two },
  footer: { paddingVertical: Spacing.three },
});

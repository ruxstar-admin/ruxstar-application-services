import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Badge } from '@/components/ui/Badge';
import { ChoiceChips } from '@/components/ui/ChoiceChips';
import { EmptyState } from '@/components/ui/EmptyState';
import { InputField } from '@/components/ui/InputField';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SegmentedTabs } from '@/components/ui/SegmentedTabs';
import { Skeleton } from '@/components/ui/Skeleton';
import { Brand, Spacing } from '@/constants/theme';
import { BUSINESS_MODULES, statusOf } from '@/features/vendor/lib/business-modules';
import { useAuthToken } from '@/hooks/use-auth-token';
import { usePaginated } from '@/hooks/use-paginated';
import { timeAgo } from '@/lib/time';
import { AdminService } from '@/services/admin-service';
import type { BusinessFilter, BusinessState } from '@/types/admin';
import type { BusinessModule } from '@/types/business';
import { Card, Row, consoleStyles, errorText } from '../components/parts';

const STATES = [
  { key: 'all', label: 'All' },
  { key: 'live', label: 'Live' },
  { key: 'draft', label: 'Drafts' },
  { key: 'suspended', label: 'On hold' },
] as const satisfies readonly { key: BusinessState | 'all'; label: string }[];

const MODULES: readonly { key: BusinessModule | 'all'; label: string }[] = [
  { key: 'all', label: 'Every module' },
  ...(['pod', 'events', 'coaching', 'stays'] as const).map((key) => ({ key, label: BUSINESS_MODULES[key].label })),
];

/** Waits this long after the last keystroke before searching. */
const SEARCH_DELAY_MS = 350;

function Results({ filter }: { filter: BusinessFilter }) {
  const router = useRouter();
  const token = useAuthToken();
  const list = usePaginated((cursor) => AdminService.businesses(token, filter, cursor));

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
    return <EmptyState icon="cloud-offline-outline" title="Could not load businesses" message={errorText(list.error)} actionLabel="Try again" onAction={list.retry} />;
  }

  return (
    <FlatList
      data={list.items}
      keyExtractor={(r) => r.business.id}
      contentContainerStyle={consoleStyles.list}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      refreshControl={<RefreshControl refreshing={list.refreshing} onRefresh={list.refresh} tintColor={Brand.primarySoft} />}
      onEndReached={list.loadMore}
      onEndReachedThreshold={0.5}
      ListEmptyComponent={
        <EmptyState icon="storefront-outline" title="No businesses here" message={filter.q ? 'Try a different name, or paste a business or owner id.' : 'Businesses vendors create show up here.'} />
      }
      ListFooterComponent={list.loadingMore ? <ActivityIndicator color={Brand.primarySoft} style={consoleStyles.footer} /> : null}
      renderItem={({ item: { business: b, owner } }) => (
        <Card>
          <Row
            name={b.name}
            avatarUrl={b.photos[0]?.url}
            title={b.name}
            subtitle={`${BUSINESS_MODULES[b.module].label} · ${owner ? `@${owner.username}` : 'Owner gone'} · ${timeAgo(b.updatedAt)}`}
            right={<Badge {...statusOf(b)} />}
            onPress={() => router.push({ pathname: '/(admin)/business/[id]', params: { id: b.id } })}
          />
        </Card>
      )}
    />
  );
}

/** Every vendor's businesses, searchable and filtered by state. */
export function BusinessesScreen() {
  const router = useRouter();
  const [text, setText] = useState('');
  const [q, setQ] = useState('');
  const [state, setState] = useState<BusinessState | 'all'>('all');
  const [module, setModule] = useState<BusinessModule | 'all'>('all');

  useEffect(() => {
    const t = setTimeout(() => setQ(text.trim()), SEARCH_DELAY_MS);
    return () => clearTimeout(t);
  }, [text]);

  const filter: BusinessFilter = { ...(q ? { q } : {}), ...(state === 'all' ? {} : { state }), ...(module === 'all' ? {} : { module }) };

  return (
    <SafeAreaView style={styles.container}>
      <View style={consoleStyles.pad}>
        <ScreenHeader title="Businesses" onBack={() => router.back()} />
      </View>
      <View style={styles.controls}>
        <InputField value={text} onChangeText={setText} placeholder="Business name or id" autoCapitalize="none" autoCorrect={false} returnKeyType="search" accessibilityLabel="Search businesses" />
        <SegmentedTabs options={STATES} value={state} onChange={setState} />
        <ChoiceChips options={MODULES} value={module} onChange={setModule} secondary />
      </View>
      <Results key={`${q}|${state}|${module}`} filter={filter} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Brand.bg },
  controls: { gap: Spacing.two, paddingHorizontal: Spacing.three, paddingBottom: Spacing.two },
});

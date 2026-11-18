import { useEffect, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Badge } from '@/components/ui/Badge';
import { ChoiceChips } from '@/components/ui/ChoiceChips';
import { EmptyState } from '@/components/ui/EmptyState';
import { InputField } from '@/components/ui/InputField';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { Brand, Spacing } from '@/constants/theme';
import { GIG_STATUS, cardPriceLine } from '@/features/gigs/lib/gigs';
import { useAuthToken } from '@/hooks/use-auth-token';
import { usePaginated } from '@/hooks/use-paginated';
import { ConsoleGigsService } from '@/services/gigs-service';
import type { ConsoleGig, ConsoleGigsQuery, GigStatus } from '@/types/gigs';
import { Card, ListFooter, Row, consoleStyles, errorText } from '../components/parts';

const STATUSES = [
  { key: 'all', label: 'All' },
  { key: 'live', label: 'Live' },
  { key: 'draft', label: 'Drafts' },
  { key: 'paused', label: 'Paused' },
  { key: 'removed', label: 'Taken down' },
] as const satisfies readonly { key: GigStatus | 'all'; label: string }[];

const SEARCH_DELAY_MS = 350;

const summary = (g: ConsoleGig) => [g.freelancer.name, g.categoryLabel, cardPriceLine(g), g.orders ? `${g.orders} orders` : null].filter(Boolean).join(' · ');

function Results({ query }: { query: ConsoleGigsQuery }) {
  const router = useRouter();
  const token = useAuthToken();
  const list = usePaginated((cursor) => ConsoleGigsService.gigs(token, query, cursor));

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
    return <EmptyState icon="cloud-offline-outline" title="Could not load gigs" message={errorText(list.error)} actionLabel="Try again" onAction={list.retry} />;
  }
  return (
    <FlatList
      data={list.items}
      keyExtractor={(g) => g.id}
      contentContainerStyle={consoleStyles.list}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      refreshControl={<RefreshControl refreshing={list.refreshing} onRefresh={list.refresh} tintColor={Brand.primarySoft} />}
      onEndReached={list.loadMore}
      onEndReachedThreshold={0.5}
      ListEmptyComponent={<EmptyState icon="briefcase-outline" title="No gigs here" message="Try another filter or word." />}
      ListFooterComponent={<ListFooter list={list} />}
      renderItem={({ item: g }) => (
        <Card>
          <Row
            name={g.title}
            avatarUrl={g.photo?.url}
            title={g.title}
            subtitle={summary(g)}
            right={<Badge {...GIG_STATUS[g.status]} />}
            onPress={() => router.push({ pathname: '/(admin)/gig-listing/[id]', params: { id: g.id } })}
          />
        </Card>
      )}
    />
  );
}

/** Every gig, drafts included, or one freelancer's, by status and words; each opens to be taken down. */
export function GigListingsScreen() {
  const router = useRouter();
  const { freelancer, label } = useLocalSearchParams<{ freelancer?: string; label?: string }>();
  const [text, setText] = useState('');
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<GigStatus | 'all'>('all');
  useEffect(() => {
    const t = setTimeout(() => setQ(text.trim()), SEARCH_DELAY_MS);
    return () => clearTimeout(t);
  }, [text]);
  const query: ConsoleGigsQuery = { ...(freelancer ? { freelancer } : {}), ...(q ? { q } : {}), ...(status === 'all' ? {} : { status }) };

  return (
    <SafeAreaView style={styles.container}>
      <View style={consoleStyles.pad}>
        <ScreenHeader title={label ? `${label}: gigs` : 'Gigs'} onBack={() => router.back()} />
      </View>
      <View style={styles.controls}>
        <InputField value={text} onChangeText={setText} placeholder="Gig title" autoCorrect={false} returnKeyType="search" maxLength={60} accessibilityLabel="Search gigs" />
      </View>
      <View style={styles.chips}>
        <ChoiceChips options={STATUSES} value={status} onChange={setStatus} />
      </View>
      <Results key={JSON.stringify(query)} query={query} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Brand.bg },
  controls: { gap: Spacing.two, paddingHorizontal: Spacing.three, paddingBottom: Spacing.two },
  chips: { paddingBottom: Spacing.two },
});

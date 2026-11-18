import { useEffect, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChoiceChips } from '@/components/ui/ChoiceChips';
import { EmptyState } from '@/components/ui/EmptyState';
import { InputField } from '@/components/ui/InputField';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { Brand, Spacing } from '@/constants/theme';
import { GigOrderRow } from '@/features/gigs/components/GigOrderRow';
import { useAuthToken } from '@/hooks/use-auth-token';
import { usePaginated } from '@/hooks/use-paginated';
import { ConsoleGigsService } from '@/services/gigs-service';
import type { ConsoleGigOrdersQuery, GigOrderStatus } from '@/types/gigs';
import { ListFooter, consoleStyles, errorText } from '../components/parts';

const STATUSES = [
  { key: 'all', label: 'All' },
  { key: 'disputed', label: 'Problems' },
  { key: 'paid', label: 'Waiting to accept' },
  { key: 'in_progress', label: 'In progress' },
  { key: 'delivered', label: 'Delivered' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
  { key: 'awaiting_payment', label: 'Not paid' },
] as const satisfies readonly { key: GigOrderStatus | 'all'; label: string }[];
type Status = (typeof STATUSES)[number]['key'];

const SEARCH_DELAY_MS = 350;

function Results({ query }: { query: ConsoleGigOrdersQuery }) {
  const router = useRouter();
  const token = useAuthToken();
  const [now] = useState(Date.now);
  const list = usePaginated((cursor) => ConsoleGigsService.orders(token, query, cursor));

  if (list.loading) {
    return (
      <View style={consoleStyles.skeletons}>
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} height={72} radius={14} />
        ))}
      </View>
    );
  }
  if (list.error && list.items.length === 0) {
    return <EmptyState icon="cloud-offline-outline" title="Could not load freelance orders" message={errorText(list.error)} actionLabel="Try again" onAction={list.retry} />;
  }
  return (
    <FlatList
      data={list.items}
      keyExtractor={(o) => o.id}
      contentContainerStyle={consoleStyles.list}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      refreshControl={<RefreshControl refreshing={list.refreshing} onRefresh={list.refresh} tintColor={Brand.primarySoft} />}
      onEndReached={list.loadMore}
      onEndReachedThreshold={0.5}
      ListEmptyComponent={
        <EmptyState
          icon="briefcase-outline"
          title={query.status === 'disputed' ? 'No problems waiting' : 'No freelance orders here'}
          message={query.status === 'disputed' ? 'Problems customers report show up here for a refund decision.' : undefined}
        />
      }
      ListFooterComponent={<ListFooter list={list} />}
      renderItem={({ item }) => (
        <GigOrderRow
          order={item}
          subtitle={`${item.freelancer.name} → ${item.customer.name}`}
          amount={item.price.total}
          now={now}
          onPress={() => router.push({ pathname: '/(admin)/gig-order/[id]', params: { id: item.id } })}
        />
      )}
    />
  );
}

/** Every freelance order, or one freelancer's, by status, order number or words; problems wait here for a decision. */
export function GigOrdersScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ freelancer?: string; label?: string; status?: string }>();
  const [text, setText] = useState('');
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<Status>(() => STATUSES.find((s) => s.key === params.status)?.key ?? 'all');
  useEffect(() => {
    const t = setTimeout(() => setQ(text.trim()), SEARCH_DELAY_MS);
    return () => clearTimeout(t);
  }, [text]);
  const query: ConsoleGigOrdersQuery = { ...(params.freelancer ? { freelancer: params.freelancer } : {}), ...(q ? { q } : {}), ...(status === 'all' ? {} : { status }) };

  return (
    <SafeAreaView style={styles.container}>
      <View style={consoleStyles.pad}>
        <ScreenHeader title={params.label ? `${params.label}: orders` : 'Freelance orders'} onBack={() => router.back()} />
      </View>
      <View style={styles.controls}>
        <InputField value={text} onChangeText={setText} placeholder="Order number or title" autoCorrect={false} returnKeyType="search" maxLength={60} accessibilityLabel="Search orders" />
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

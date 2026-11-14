import { useEffect, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { InputField } from '@/components/ui/InputField';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SegmentedTabs } from '@/components/ui/SegmentedTabs';
import { Skeleton } from '@/components/ui/Skeleton';
import { Brand, Spacing } from '@/constants/theme';
import { EVENT_STATUS, dayText, soldLine } from '@/features/events/lib/events';
import { useAuthToken } from '@/hooks/use-auth-token';
import { usePaginated } from '@/hooks/use-paginated';
import { AdminService } from '@/services/admin-service';
import type { EventFilter } from '@/types/admin';
import { Card, ListFooter, Row, consoleStyles, errorText } from '../components/parts';

type Status = NonNullable<EventFilter['status']>;

/** Published covers events on sale and ones that have ended; the API keeps both as live. */
const STATUSES = [
  { key: 'all', label: 'All' },
  { key: 'live', label: 'Published' },
  { key: 'draft', label: 'Drafts' },
  { key: 'cancelled', label: 'Cancelled' },
] as const satisfies readonly { key: Status | 'all'; label: string }[];

/** Waits this long after the last keystroke before searching. */
const SEARCH_DELAY_MS = 350;

function Results({ filter }: { filter: EventFilter }) {
  const router = useRouter();
  const token = useAuthToken();
  const list = usePaginated((cursor) => AdminService.events(token, filter, cursor));

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
    return <EmptyState icon="cloud-offline-outline" title="Could not load events" message={errorText(list.error)} actionLabel="Try again" onAction={list.retry} />;
  }

  return (
    <FlatList
      data={list.items}
      keyExtractor={(e) => e.id}
      contentContainerStyle={consoleStyles.list}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      refreshControl={<RefreshControl refreshing={list.refreshing} onRefresh={list.refresh} tintColor={Brand.primarySoft} />}
      onEndReached={list.loadMore}
      onEndReachedThreshold={0.5}
      ListEmptyComponent={
        <EmptyState icon="ticket-outline" title="No events here" message={filter.q ? 'Try another word from the event name or the organiser’s name.' : 'Events organisers make show up here.'} />
      }
      ListFooterComponent={<ListFooter list={list} />}
      renderItem={({ item: e }) => (
        <Card>
          <Row
            name={e.title}
            avatarUrl={e.photo?.url}
            title={e.title}
            subtitle={`${e.business.name} · ${dayText(e.startsAt)} · ${e.status === 'draft' ? 'Not published' : soldLine(e)}`}
            right={<Badge {...EVENT_STATUS[e.status]} />}
            onPress={() => router.push({ pathname: '/(admin)/event/[id]', params: { id: e.id } })}
          />
        </Card>
      )}
    />
  );
}

/** Every organiser's events, newest first, searchable by name and filtered by status. */
export function EventsScreen() {
  const router = useRouter();
  const [text, setText] = useState('');
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<Status | 'all'>('all');

  useEffect(() => {
    const t = setTimeout(() => setQ(text.trim()), SEARCH_DELAY_MS);
    return () => clearTimeout(t);
  }, [text]);

  const filter: EventFilter = { ...(q ? { q } : {}), ...(status === 'all' ? {} : { status }) };

  return (
    <SafeAreaView style={styles.container}>
      <View style={consoleStyles.pad}>
        <ScreenHeader title="Events" onBack={() => router.back()} />
      </View>
      <View style={styles.controls}>
        <InputField
          value={text}
          onChangeText={setText}
          placeholder="Event or organiser name"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          maxLength={60}
          accessibilityLabel="Search events"
        />
        <SegmentedTabs options={STATUSES} value={status} onChange={setStatus} />
      </View>
      <Results key={`${q}|${status}`} filter={filter} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Brand.bg },
  controls: { gap: Spacing.two, paddingHorizontal: Spacing.three, paddingBottom: Spacing.two },
});

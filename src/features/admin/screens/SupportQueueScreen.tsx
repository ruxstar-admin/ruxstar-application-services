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
import { TextLink } from '@/components/ui/TextLink';
import { Brand, Spacing } from '@/constants/theme';
import { CATEGORIES, CATEGORY_LABEL, PRIORITY } from '@/features/support/lib/support';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { useAuthToken } from '@/hooks/use-auth-token';
import { usePaginated } from '@/hooks/use-paginated';
import { useRefetchOnFocus } from '@/hooks/use-refetch-on-focus';
import { timeAgo } from '@/lib/time';
import { SupportDeskService } from '@/services/support-service';
import type { QueueFilter, QueueStatus, StaffTicket, SupportCategory } from '@/types/support';
import { Card, Row, consoleStyles, errorText } from '../components/parts';

const STATUSES = [
  { key: 'open', label: 'Open' },
  { key: 'waiting', label: 'Waiting on them' },
  { key: 'resolved', label: 'Resolved' },
] as const satisfies readonly { key: QueueStatus; label: string }[];

type Who = 'all' | 'me' | 'none';
const WHO = [
  { key: 'all', label: 'Everyone' },
  { key: 'me', label: 'Mine' },
  { key: 'none', label: 'Nobody on it' },
] as const satisfies readonly { key: Who; label: string }[];

const TOPICS: readonly { key: SupportCategory | 'all'; label: string }[] = [{ key: 'all', label: 'Every topic' }, ...CATEGORIES];

/** Waits this long after the last keystroke before searching. */
const SEARCH_DELAY_MS = 350;

/** Past its reply-by time first, then how urgent it is; nothing for normal and low. */
function Flag({ t }: { t: StaffTicket }) {
  if (t.overdue) return <Badge label="Overdue" tone="error" />;
  if (t.status === 'open' && (t.priority === 'urgent' || t.priority === 'high')) return <Badge {...PRIORITY[t.priority]} />;
  return null;
}

function Results({ filter }: { filter: QueueFilter }) {
  const router = useRouter();
  const token = useAuthToken();
  const list = usePaginated((cursor) => SupportDeskService.queue(token, filter, cursor));
  useRefetchOnFocus(list.refresh);

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
    return <EmptyState icon="cloud-offline-outline" title="Could not load tickets" message={errorText(list.error)} actionLabel="Try again" onAction={list.retry} />;
  }

  return (
    <FlatList
      data={list.items}
      keyExtractor={(t) => t.id}
      contentContainerStyle={consoleStyles.list}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      refreshControl={<RefreshControl refreshing={list.refreshing} onRefresh={list.refresh} tintColor={Brand.primarySoft} />}
      onEndReached={list.loadMore}
      onEndReachedThreshold={0.5}
      ListEmptyComponent={
        <EmptyState
          icon="help-buoy-outline"
          title={filter.q ? 'No ticket with that number' : 'Nothing here'}
          message={filter.status === 'open' ? 'Tickets waiting for Ruxstar show up here.' : undefined}
        />
      }
      ListFooterComponent={list.loadingMore ? <ActivityIndicator color={Brand.primarySoft} style={consoleStyles.footer} /> : null}
      renderItem={({ item: t }) => (
        <Card>
          <Row
            name={t.requester.name}
            title={t.subject}
            subtitle={`${t.number} · ${CATEGORY_LABEL[t.category]} · ${t.assignee?.name ?? 'Nobody'} · ${timeAgo(t.lastAt)}`}
            right={<Flag t={t} />}
            onPress={() => router.push({ pathname: '/(admin)/support/[id]', params: { id: t.id } })}
          />
        </Card>
      )}
    />
  );
}

/** Help tickets for the Ruxstar team, latest activity first, filtered by state, topic and who has them. */
export function SupportQueueScreen() {
  const router = useRouter();
  const token = useAuthToken();
  const summary = useAsyncResource(() => SupportDeskService.summary(token));
  useRefetchOnFocus(summary.reload);
  const [text, setText] = useState('');
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<QueueStatus>('open');
  const [who, setWho] = useState<Who>('all');
  const [topic, setTopic] = useState<SupportCategory | 'all'>('all');

  useEffect(() => {
    const t = setTimeout(() => setQ(text.trim()), SEARCH_DELAY_MS);
    return () => clearTimeout(t);
  }, [text]);

  const filter: QueueFilter = { status, ...(q ? { q } : {}), ...(who === 'all' ? {} : { assignee: who }), ...(topic === 'all' ? {} : { category: topic }) };
  const s = summary.data;

  return (
    <SafeAreaView style={styles.container}>
      <View style={consoleStyles.pad}>
        <ScreenHeader title="Help tickets" onBack={() => router.back()} />
      </View>
      <View style={styles.controls}>
        {s ? (
          <View style={styles.counts}>
            <Badge label={`${s.open} open`} tone="accent" />
            {s.overdue ? <Badge label={`${s.overdue} overdue`} tone="error" /> : null}
            {s.unassigned ? <Badge label={`${s.unassigned} with nobody on them`} tone="warning" /> : null}
            {s.mine ? <Badge label={`${s.mine} yours`} /> : null}
          </View>
        ) : null}
        <InputField value={text} onChangeText={setText} placeholder="Ticket number, like RX-1042" autoCapitalize="characters" autoCorrect={false} returnKeyType="search" accessibilityLabel="Find a ticket" />
        <SegmentedTabs options={STATUSES} value={status} onChange={setStatus} />
        <ChoiceChips options={WHO} value={who} onChange={setWho} secondary />
        <ChoiceChips options={TOPICS} value={topic} onChange={setTopic} secondary />
        <TextLink muted label="Reply-by times" onPress={() => router.push('/(admin)/support/settings')} />
      </View>
      <Results key={`${q}|${status}|${who}|${topic}`} filter={filter} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Brand.bg },
  controls: { gap: Spacing.two, paddingHorizontal: Spacing.three, paddingBottom: Spacing.two },
  counts: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
});

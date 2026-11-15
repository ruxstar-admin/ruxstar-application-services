import { useEffect, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { InputField } from '@/components/ui/InputField';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { TextLink } from '@/components/ui/TextLink';
import { Brand, Spacing } from '@/constants/theme';
import { CATEGORIES, DESK_STATUS, PRIORITY } from '@/features/support/lib/support';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { useAuthToken } from '@/hooks/use-auth-token';
import { usePaginated } from '@/hooks/use-paginated';
import { useRefetchOnFocus } from '@/hooks/use-refetch-on-focus';
import { timeAgo } from '@/lib/time';
import { SupportDeskService } from '@/services/support-service';
import type { QueueFilter, QueueStatus, StaffTicket, SupportCategory, SupportSummary } from '@/types/support';
import { FilterBar, FilterButton, OptionSheet } from '../components/filters';
import { Card, ListFooter, Row, consoleStyles, errorText } from '../components/parts';
import { QUEUE_DEFAULT, queueFiltered, queueQuery, type Assigned, type QueueChoice } from '../lib/filters';

const STATUSES = [
  { key: 'open', label: 'Open' },
  { key: 'waiting', label: 'Waiting on them' },
  { key: 'resolved', label: 'Resolved' },
] as const satisfies readonly { key: QueueStatus; label: string }[];

const ASSIGNED = [
  { key: 'all', label: 'Anyone' },
  { key: 'me', label: 'Me' },
  { key: 'none', label: 'Nobody' },
] as const satisfies readonly { key: Assigned; label: string }[];

const TOPICS: readonly { key: SupportCategory | 'all'; label: string }[] = [{ key: 'all', label: 'Every topic' }, ...CATEGORIES];

/** Waits this long after the last keystroke before searching. */
const SEARCH_DELAY_MS = 350;

const labelOf = <K extends string>(options: readonly { key: K; label: string }[], key: K) => options.find((o) => o.key === key)?.label ?? key;

/** Status, then past its reply-by time or how urgent it is. */
function Flags({ t }: { t: StaffTicket }) {
  const status = t.status === 'waiting' ? { label: 'Waiting', tone: DESK_STATUS.waiting.tone } : DESK_STATUS[t.status];
  return (
    <View style={styles.flags}>
      <Badge {...status} />
      {t.overdue ? <Badge label="Overdue" tone="error" /> : <Badge {...PRIORITY[t.priority]} />}
    </View>
  );
}

function Results({ filter, filtered }: { filter: QueueFilter; filtered: boolean }) {
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
          title={filter.q ? 'No ticket with that number' : filtered ? 'No tickets for these filters' : 'Nothing here'}
          message={!filtered ? 'Tickets waiting for Ruxstar show up here.' : undefined}
        />
      }
      ListFooterComponent={<ListFooter list={list} />}
      renderItem={({ item: t }) => (
        <Card>
          <Row
            name={t.requester.name}
            title={t.subject}
            subtitle={`${t.number} · ${timeAgo(t.lastAt)} · ${t.requester.name || `@${t.requester.username}`}`}
            right={<Flags t={t} />}
            onPress={() => router.push({ pathname: '/(admin)/support/[id]', params: { id: t.id } })}
          />
        </Card>
      )}
    />
  );
}

const countsLine = (s: SupportSummary) =>
  [`${s.open} open`, s.overdue ? `${s.overdue} overdue` : null, s.unassigned ? `${s.unassigned} with nobody on them` : null, s.mine ? `${s.mine} yours` : null]
    .filter(Boolean)
    .join(' · ');

/** Help tickets for the Ruxstar team, latest activity first, filtered by state, topic and who has them. */
export function SupportQueueScreen() {
  const router = useRouter();
  const token = useAuthToken();
  const summary = useAsyncResource(() => SupportDeskService.summary(token));
  useRefetchOnFocus(summary.reload);
  const [text, setText] = useState('');
  const [choice, setChoice] = useState<QueueChoice>(QUEUE_DEFAULT);
  const [sheet, setSheet] = useState<'status' | 'assigned' | 'topic' | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setChoice((c) => (c.q === text.trim() ? c : { ...c, q: text.trim() })), SEARCH_DELAY_MS);
    return () => clearTimeout(t);
  }, [text]);

  const change = (patch: Partial<QueueChoice>) => setChoice((c) => ({ ...c, ...patch }));
  const filter = queueQuery(choice);
  const filtered = queueFiltered(choice);
  const s = summary.data;

  return (
    <SafeAreaView style={styles.container}>
      <View style={consoleStyles.pad}>
        <ScreenHeader title="Help tickets" onBack={() => router.back()} />
      </View>
      <View style={styles.controls}>
        <View style={styles.top}>
          <Text style={[consoleStyles.muted, styles.flex]} numberOfLines={1}>
            {s ? countsLine(s) : ' '}
          </Text>
          <TextLink muted label="Reply-by times" onPress={() => router.push('/(admin)/support/settings')} />
        </View>
        <InputField
          value={text}
          onChangeText={setText}
          placeholder="Ticket number, like RX-1042"
          autoCapitalize="characters"
          autoCorrect={false}
          returnKeyType="search"
          accessibilityLabel="Find a ticket"
          accessory={<Ionicons name="search" size={18} color={Brand.textMuted} />}
        />
      </View>
      <FilterBar
        clearLabel="Clear"
        onClear={
          filtered
            ? () => {
                setText('');
                setChoice(QUEUE_DEFAULT);
              }
            : undefined
        }
      >
        <FilterButton label={labelOf(STATUSES, choice.status)} active={choice.status !== QUEUE_DEFAULT.status} onPress={() => setSheet('status')} />
        <FilterButton
          icon="person-outline"
          label={choice.assigned === 'all' ? 'Assigned: Anyone' : `Assigned: ${labelOf(ASSIGNED, choice.assigned)}`}
          active={choice.assigned !== 'all'}
          onPress={() => setSheet('assigned')}
        />
        <FilterButton label={labelOf(TOPICS, choice.topic)} active={choice.topic !== 'all'} onPress={() => setSheet('topic')} />
      </FilterBar>
      <Results key={JSON.stringify(filter)} filter={filter} filtered={filtered} />

      <OptionSheet visible={sheet === 'status'} title="Status" options={STATUSES} value={choice.status} onPick={(status) => change({ status })} onClose={() => setSheet(null)} />
      <OptionSheet visible={sheet === 'assigned'} title="Assigned to" options={ASSIGNED} value={choice.assigned} onPick={(assigned) => change({ assigned })} onClose={() => setSheet(null)} />
      <OptionSheet visible={sheet === 'topic'} title="Topic" options={TOPICS} value={choice.topic} onPick={(topic) => change({ topic })} onClose={() => setSheet(null)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Brand.bg },
  flex: { flex: 1 },
  controls: { paddingHorizontal: Spacing.three },
  top: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingBottom: Spacing.two },
  flags: { alignItems: 'flex-end', gap: Spacing.one },
});

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
import { TextLink } from '@/components/ui/TextLink';
import { Brand, Spacing } from '@/constants/theme';
import { GROUND_STATUS, sportsText } from '@/features/turf/lib/turf';
import { useAuthToken } from '@/hooks/use-auth-token';
import { usePaginated } from '@/hooks/use-paginated';
import { AdminService } from '@/services/admin-service';
import type { ConsoleGround, ConsoleGroundFilter, GroundStatus } from '@/types/turf';
import { Card, ListFooter, Row, consoleStyles, errorText } from '../components/parts';

const STATUSES = [
  { key: 'all', label: 'All' },
  { key: 'live', label: 'Live' },
  { key: 'draft', label: 'Drafts' },
  { key: 'removed', label: 'Taken down' },
] as const satisfies readonly { key: GroundStatus | 'all'; label: string }[];

/** Waits this long after the last keystroke before searching. */
const SEARCH_DELAY_MS = 350;

const summary = (g: ConsoleGround) =>
  [g.business.name, g.city, g.sports.length ? sportsText(g.sports) : null, `${g.courts} ${g.courts === 1 ? 'court' : 'courts'}`].filter(Boolean).join(' · ');

function Results({ filter }: { filter: ConsoleGroundFilter }) {
  const router = useRouter();
  const token = useAuthToken();
  const list = usePaginated((cursor) => AdminService.grounds(token, filter, cursor));

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
    return <EmptyState icon="cloud-offline-outline" title="Could not load grounds" message={errorText(list.error)} actionLabel="Try again" onAction={list.retry} />;
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
      ListEmptyComponent={
        <EmptyState icon="football-outline" title="No grounds here" message={filter.q ? 'Try another word from the ground’s or the business’s name.' : 'Grounds owners add show up here.'} />
      }
      ListFooterComponent={<ListFooter list={list} />}
      renderItem={({ item: g }) => (
        <Card>
          <Row
            name={g.name}
            avatarUrl={g.photo?.url}
            title={g.name}
            subtitle={summary(g)}
            right={<Badge {...GROUND_STATUS[g.status]} />}
            onPress={() => router.push({ pathname: '/(admin)/ground/[id]', params: { id: g.id } })}
          />
        </Card>
      )}
    />
  );
}

/** Every sports ground, newest first, searchable by name and filtered by status. */
export function GroundsScreen() {
  const router = useRouter();
  const [text, setText] = useState('');
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<GroundStatus | 'all'>('all');

  useEffect(() => {
    const t = setTimeout(() => setQ(text.trim()), SEARCH_DELAY_MS);
    return () => clearTimeout(t);
  }, [text]);

  const filter: ConsoleGroundFilter = { ...(q ? { q } : {}), ...(status === 'all' ? {} : { status }) };

  return (
    <SafeAreaView style={styles.container}>
      <View style={consoleStyles.pad}>
        <ScreenHeader title="Grounds" onBack={() => router.back()} />
      </View>
      <View style={styles.controls}>
        <InputField
          value={text}
          onChangeText={setText}
          placeholder="Ground or business name"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          maxLength={60}
          accessibilityLabel="Search grounds"
        />
        <SegmentedTabs options={STATUSES} value={status} onChange={setStatus} />
        <TextLink label="Sports grounds can offer" onPress={() => router.push('/(admin)/sports')} />
      </View>
      <Results key={`${q}|${status}`} filter={filter} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Brand.bg },
  controls: { gap: Spacing.two, paddingHorizontal: Spacing.three, paddingBottom: Spacing.two },
});

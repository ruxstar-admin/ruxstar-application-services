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
import { KIND_LABEL, PROPERTY_STATUS, priceFromText } from '@/features/stays/lib/stays';
import { useAuthToken } from '@/hooks/use-auth-token';
import { usePaginated } from '@/hooks/use-paginated';
import { ConsoleStaysService } from '@/services/stays-service';
import type { ConsoleProperty, ConsolePropertyFilter, PropertyStatus } from '@/types/stays';
import { Card, ListFooter, Row, consoleStyles, errorText } from '../components/parts';

const STATUSES = [
  { key: 'all', label: 'All' },
  { key: 'live', label: 'Live' },
  { key: 'draft', label: 'Drafts' },
  { key: 'removed', label: 'Taken down' },
] as const satisfies readonly { key: PropertyStatus | 'all'; label: string }[];

/** Waits this long after the last keystroke before filtering. */
const SEARCH_DELAY_MS = 350;

const summary = (p: ConsoleProperty) => [KIND_LABEL[p.kind], p.business.name, [p.area, p.city].filter(Boolean).join(', '), priceFromText(p.priceFrom)].filter(Boolean).join(' · ');

function Results({ filter }: { filter: ConsolePropertyFilter }) {
  const router = useRouter();
  const token = useAuthToken();
  const list = usePaginated((cursor) => ConsoleStaysService.properties(token, filter, cursor));

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
    return <EmptyState icon="cloud-offline-outline" title="Could not load properties" message={errorText(list.error)} actionLabel="Try again" onAction={list.retry} />;
  }

  return (
    <FlatList
      data={list.items}
      keyExtractor={(p) => p.id}
      contentContainerStyle={consoleStyles.list}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      refreshControl={<RefreshControl refreshing={list.refreshing} onRefresh={list.refresh} tintColor={Brand.primarySoft} />}
      onEndReached={list.loadMore}
      onEndReachedThreshold={0.5}
      ListEmptyComponent={
        <EmptyState icon="bed-outline" title="No properties here" message={filter.city ? 'Try another city.' : 'PGs and hostels owners add show up here.'} />
      }
      ListFooterComponent={<ListFooter list={list} />}
      renderItem={({ item: p }) => (
        <Card>
          <Row
            name={p.name}
            avatarUrl={p.photo?.url}
            title={p.name}
            subtitle={summary(p)}
            right={<Badge {...PROPERTY_STATUS[p.status]} />}
            onPress={() => router.push({ pathname: '/(admin)/property/[id]', params: { id: p.id } })}
          />
        </Card>
      )}
    />
  );
}

/** Every PG and hostel, newest first, by city and status. */
export function PropertiesScreen() {
  const router = useRouter();
  const [text, setText] = useState('');
  const [city, setCity] = useState('');
  const [status, setStatus] = useState<PropertyStatus | 'all'>('all');

  useEffect(() => {
    const t = setTimeout(() => setCity(text.trim()), SEARCH_DELAY_MS);
    return () => clearTimeout(t);
  }, [text]);

  const filter: ConsolePropertyFilter = { ...(city ? { city } : {}), ...(status === 'all' ? {} : { status }) };

  return (
    <SafeAreaView style={styles.container}>
      <View style={consoleStyles.pad}>
        <ScreenHeader title="PGs & hostels" onBack={() => router.back()} />
      </View>
      <View style={styles.controls}>
        <InputField
          value={text}
          onChangeText={setText}
          placeholder="City"
          autoCapitalize="words"
          autoCorrect={false}
          returnKeyType="search"
          maxLength={60}
          accessibilityLabel="Filter by city"
        />
        <SegmentedTabs options={STATUSES} value={status} onChange={setStatus} />
        <View style={styles.links}>
          <TextLink label="Objections" onPress={() => router.push('/(admin)/objections')} />
          <TextLink label="Facilities" onPress={() => router.push('/(admin)/facilities')} />
        </View>
      </View>
      <Results key={`${city}|${status}`} filter={filter} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Brand.bg },
  controls: { gap: Spacing.two, paddingHorizontal: Spacing.three, paddingBottom: Spacing.two },
  links: { flexDirection: 'row', gap: Spacing.four },
});

import { useEffect, useState } from 'react';
import { FlatList, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ChoiceChips } from '@/components/ui/ChoiceChips';
import { EmptyState } from '@/components/ui/EmptyState';
import { ListRow } from '@/components/ui/ListRow';
import { Skeleton } from '@/components/ui/Skeleton';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { searchRoute } from '@/features/discover/lib/module-routes';
import { useAuthToken } from '@/hooks/use-auth-token';
import { SocialService } from '@/services/social-service';
import { SEARCH_SCOPES, type SearchResult, type SearchScope } from '@/types/social';

const DEBOUNCE_MS = 350;
const MIN_QUERY = 2;

interface Outcome {
  key: string;
  results: SearchResult[];
  failed: boolean;
}

const ICONS: Record<SearchScope, keyof typeof Ionicons.glyphMap> = {
  people: 'person-outline',
  businesses: 'storefront-outline',
  events: 'calendar-outline',
  courses: 'school-outline',
  stays: 'bed-outline',
};

/** Search people, businesses, events, courses and stays. Typing is debounced and stale responses are ignored. */
export function SearchScreen() {
  const router = useRouter();
  const token = useAuthToken();
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState<SearchScope>('people');
  const [outcome, setOutcome] = useState<Outcome | null>(null);

  const term = query.trim();
  const searchKey = `${scope}:${term}`;
  const searchable = term.length >= MIN_QUERY;

  useEffect(() => {
    if (!searchable) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      SocialService.search(token, term, scope)
        .then((results) => !cancelled && setOutcome({ key: searchKey, results, failed: false }))
        .catch(() => !cancelled && setOutcome({ key: searchKey, results: [], failed: true }));
    }, DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [searchable, term, scope, searchKey, token]);

  const current = searchable && outcome?.key === searchKey ? outcome : null;
  const loading = searchable && !current;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.searchBox}>
        <Ionicons name="search" size={20} color={Brand.textMuted} />
        <TextInput
          style={styles.input}
          value={query}
          onChangeText={setQuery}
          placeholder="Search Ruxstar"
          placeholderTextColor={Brand.textFaint}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          accessibilityLabel="Search"
        />
      </View>

      <ChoiceChips options={SEARCH_SCOPES} value={scope} onChange={setScope} />

      {loading ? (
        <View style={styles.skeletons}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} height={56} radius={14} />
          ))}
        </View>
      ) : (
        <FlatList
          data={current?.results ?? []}
          keyExtractor={(result) => result.id}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => {
            const route = searchRoute(item);
            return <ListRow icon={ICONS[item.scope]} title={item.title} subtitle={item.subtitle} onPress={route ? () => router.push(route as never) : undefined} />;
          }}
          ListEmptyComponent={
            !searchable ? (
              <EmptyState icon="search-outline" title="Find anything on Ruxstar" message="Search for people, businesses, events, courses and stays." />
            ) : current?.failed ? (
              <EmptyState icon="cloud-offline-outline" title="Search failed" message="Check your connection and try again." />
            ) : (
              <EmptyState icon="sad-outline" title="No results" message={`Nothing matched "${term}" in ${SEARCH_SCOPES.find((s) => s.key === scope)?.label}.`} />
            )
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Brand.bg, gap: Spacing.three },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    height: 48,
    marginHorizontal: Spacing.three,
    marginTop: Spacing.three,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.pill,
    backgroundColor: Brand.surfaceAlt,
  },
  input: { flex: 1, ...Typography.body, color: Brand.text, paddingVertical: 0 },
  list: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.five },
  skeletons: { gap: Spacing.three, paddingHorizontal: Spacing.three },
});

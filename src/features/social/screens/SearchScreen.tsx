import { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Avatar } from '@/components/ui/Avatar';
import { ChoiceChips } from '@/components/ui/ChoiceChips';
import { EmptyState } from '@/components/ui/EmptyState';
import { ListRow } from '@/components/ui/ListRow';
import { Skeleton } from '@/components/ui/Skeleton';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { searchRoute } from '@/features/discover/lib/module-routes';
import { useAuthToken } from '@/hooks/use-auth-token';
import { ProfileService } from '@/services/profile-service';
import { SocialService } from '@/services/social-service';
import type { Profile } from '@/types/profile';
import { SEARCH_SCOPES, type SearchResult, type SearchScope } from '@/types/social';

const toResult = (p: Profile): SearchResult => ({
  id: p.id,
  scope: 'people',
  title: p.name,
  subtitle: [`@${p.username}`, p.city].filter(Boolean).join(' · '),
  avatarUrl: p.avatarUrl,
});

/** People come from `/v1/account`; the other scopes stay mocked until their modules exist. */
const searchIn = async (token: string, term: string, scope: SearchScope): Promise<SearchResult[]> => {
  if (scope !== 'people') return SocialService.search(token, term, scope);
  return (await ProfileService.search(token, term)).map(toResult);
};

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
      searchIn(token, term, scope)
        .then((results) => !cancelled && setOutcome({ key: searchKey, results, failed: false }))
        .catch(() => !cancelled && setOutcome({ key: searchKey, results: [], failed: true }));
    }, DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [searchable, term, scope, searchKey, token]);

  // Before typing, People lists the newest members. Loaded once; a failure just leaves the hint.
  const [newest, setNewest] = useState<SearchResult[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    ProfileService.search(token)
      .then((people) => !cancelled && setNewest(people.map(toResult)))
      .catch(() => !cancelled && setNewest([]));
    return () => {
      cancelled = true;
    };
  }, [token]);
  const browsing = !searchable && scope === 'people';

  const current = searchable && outcome?.key === searchKey ? outcome : null;
  const loading = (searchable && !current) || (browsing && newest === null);
  const results = browsing ? (newest ?? []) : (current?.results ?? []);

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
          data={results}
          keyExtractor={(result) => result.id}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          ListHeaderComponent={browsing && results.length > 0 ? <Text style={styles.section}>New on Ruxstar</Text> : null}
          renderItem={({ item }) => {
            const route = searchRoute(item);
            return (
              <ListRow
                icon={ICONS[item.scope]}
                leading={item.scope === 'people' ? <Avatar name={item.title} uri={item.avatarUrl} size={40} /> : undefined}
                title={item.title}
                subtitle={item.subtitle}
                onPress={route ? () => router.push(route as never) : undefined}
              />
            );
          }}
          ListEmptyComponent={
            !searchable ? (
              <EmptyState icon="search-outline" title="Find anything on Ruxstar" message="Search people by name or @username, or find businesses, events, courses and stays." />
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
  section: { ...Typography.overline, color: Brand.textMuted, paddingBottom: Spacing.two },
  skeletons: { gap: Spacing.three, paddingHorizontal: Spacing.three },
});

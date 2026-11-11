import { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { ListRow } from '@/components/ui/ListRow';
import { Skeleton } from '@/components/ui/Skeleton';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { useAuthToken } from '@/hooks/use-auth-token';
import { ProfileService } from '@/services/profile-service';
import type { Profile } from '@/types/profile';

const DEBOUNCE_MS = 350;
const MIN_QUERY = 2;

interface Outcome {
  term: string;
  people: Profile[];
  failed: boolean;
}

const subtitleOf = (p: Profile) => [`@${p.username}`, p.city].filter(Boolean).join(' · ');

/**
 * Search people by name or @username. Businesses, events, courses and stays join
 * once their modules have a real API. Typing is debounced and stale responses are ignored.
 */
export function SearchScreen() {
  const router = useRouter();
  const token = useAuthToken();
  const [query, setQuery] = useState('');
  const [outcome, setOutcome] = useState<Outcome | null>(null);

  const term = query.trim();
  const searchable = term.length >= MIN_QUERY;

  useEffect(() => {
    if (!searchable) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      ProfileService.search(token, term)
        .then((people) => !cancelled && setOutcome({ term, people, failed: false }))
        .catch(() => !cancelled && setOutcome({ term, people: [], failed: true }));
    }, DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [searchable, term, token]);

  // Before typing, list the newest members. Loaded once; a failure just leaves the hint.
  const [newest, setNewest] = useState<Profile[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    ProfileService.search(token)
      .then((people) => !cancelled && setNewest(people))
      .catch(() => !cancelled && setNewest([]));
    return () => {
      cancelled = true;
    };
  }, [token]);

  const current = searchable && outcome?.term === term ? outcome : null;
  const loading = searchable ? !current : newest === null;
  const results = searchable ? (current?.people ?? []) : (newest ?? []);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.searchBox}>
        <Ionicons name="search" size={20} color={Brand.textMuted} />
        <TextInput
          style={styles.input}
          value={query}
          onChangeText={setQuery}
          placeholder="Search people"
          placeholderTextColor={Brand.textFaint}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          accessibilityLabel="Search people"
        />
      </View>

      {loading ? (
        <View style={styles.skeletons}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} height={56} radius={14} />
          ))}
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(person) => person.id}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          ListHeaderComponent={!searchable && results.length > 0 ? <Text style={styles.section}>New on Ruxstar</Text> : null}
          renderItem={({ item }) => (
            <ListRow
              icon="person-outline"
              leading={<Avatar name={item.name} uri={item.avatarUrl} size={40} />}
              title={item.name}
              subtitle={subtitleOf(item)}
              onPress={() => router.push({ pathname: '/(customer)/user/[id]', params: { id: item.id } })}
            />
          )}
          ListEmptyComponent={
            !searchable ? (
              <EmptyState icon="search-outline" title="Find people on Ruxstar" message="Search by name or @username." />
            ) : current?.failed ? (
              <EmptyState icon="cloud-offline-outline" title="Search failed" message="Check your connection and try again." />
            ) : (
              <EmptyState icon="sad-outline" title="No one found" message={`Nobody matched "${term}".`} />
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

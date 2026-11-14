import { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { ListRow } from '@/components/ui/ListRow';
import { Skeleton } from '@/components/ui/Skeleton';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { useAuthToken } from '@/hooks/use-auth-token';
import { Feedback } from '@/lib/haptics';
import { ProfileService } from '@/services/profile-service';
import type { Profile } from '@/types/profile';
import { useRecentPeople } from '../hooks/use-recent-people';
import type { RecentPerson } from '../lib/recent-people';

const DEBOUNCE_MS = 350;
const MIN_QUERY = 2;

interface Outcome {
  term: string;
  people: Profile[];
  failed: boolean;
}

const subtitleOf = (p: Pick<Profile, 'username' | 'city'>) => [`@${p.username}`, p.city].filter(Boolean).join(' · ');

/**
 * Search people by name or @username; shops are searched in Discover. Before typing it shows the people you
 * opened from here lately (this device only), then the newest members. Typing is debounced and stale responses are ignored.
 */
export function SearchScreen() {
  const router = useRouter();
  const token = useAuthToken();
  const recent = useRecentPeople();
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
  const showRecent = !searchable && recent.people.length > 0;

  const open = (person: RecentPerson) => {
    recent.add(person);
    router.push({ pathname: '/(customer)/user/[id]', params: { id: person.id } });
  };

  const recentList = showRecent ? (
    <View style={styles.recent}>
      <View style={styles.sectionRow}>
        <Text style={styles.section}>Recent</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Clear recent searches"
          hitSlop={8}
          onPress={() => {
            Feedback.select();
            recent.clear();
          }}
        >
          <Text style={styles.clear}>Clear</Text>
        </Pressable>
      </View>
      {recent.people.map((person) => (
        <ListRow
          key={person.id}
          leading={<Avatar name={person.name} uri={person.avatarUrl} size={40} />}
          title={person.name}
          subtitle={subtitleOf(person)}
          onPress={() => open(person)}
          right={
            <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${person.name} from recent`} hitSlop={10} onPress={() => recent.remove(person.id)}>
              <Ionicons name="close" size={18} color={Brand.textMuted} />
            </Pressable>
          }
        />
      ))}
    </View>
  ) : null;

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
          ListHeaderComponent={
            !searchable && (showRecent || results.length > 0) ? (
              <>
                {recentList}
                {results.length > 0 ? <Text style={styles.section}>New on Ruxstar</Text> : null}
              </>
            ) : null
          }
          renderItem={({ item }) => (
            <ListRow
              icon="person-outline"
              leading={<Avatar name={item.name} uri={item.avatarUrl} size={40} />}
              title={item.name}
              subtitle={subtitleOf(item)}
              onPress={() => open({ id: item.id, name: item.name, username: item.username, avatarUrl: item.avatarUrl, city: item.city })}
            />
          )}
          ListEmptyComponent={
            showRecent ? null : !searchable ? (
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
  recent: { paddingBottom: Spacing.three },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  clear: { ...Typography.caption, fontSize: 14, color: Brand.text, paddingBottom: Spacing.two },
  skeletons: { gap: Spacing.three, paddingHorizontal: Spacing.three },
});

import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '@/components/ui/Avatar';
import { Skeleton } from '@/components/ui/Skeleton';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { useAuthToken } from '@/hooks/use-auth-token';
import { Feedback } from '@/lib/haptics';
import { ChatService } from '@/services/chat-service';
import type { Contact } from '@/types/chat';

const DEBOUNCE_MS = 300;
const MIN_CHARS = 2;
const MAX_SHOWN = 8;

interface PersonSearchProps {
  picked: Contact | null;
  onPick: (person: Contact | null) => void;
  /** People already on the team or invited: shown, but they can't be picked again. */
  taken: ReadonlySet<string>;
  error?: string;
}

interface Loaded {
  q: string;
  people: Contact[];
  failed: boolean;
}

/** Find someone to invite by name or username, then pick them. Results for an older query are ignored. */
export function PersonSearch({ picked, onPick, taken, error }: PersonSearchProps) {
  const token = useAuthToken();
  const [query, setQuery] = useState('');
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const q = query.trim().replace(/^@/, '');
  const searching = !picked && q.length >= MIN_CHARS;

  useEffect(() => {
    if (!searching) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      ChatService.contacts(token, q)
        .then((people) => !cancelled && setLoaded({ q, people, failed: false }))
        .catch(() => !cancelled && setLoaded({ q, people: [], failed: true }));
    }, DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [q, searching, token]);

  if (picked) {
    return (
      <View style={styles.gap}>
        <Text style={styles.label}>Inviting</Text>
        <View style={[styles.picked, error && styles.pickedError]}>
          <Avatar name={picked.name} uri={picked.avatarUrl} size={44} />
          <View style={styles.text}>
            <Text style={styles.name}>{picked.name}</Text>
            <Text style={styles.username}>@{picked.username}</Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel={`Change from ${picked.name}`} hitSlop={10} onPress={() => onPick(null)}>
            <Text style={styles.change}>Change</Text>
          </Pressable>
        </View>
        <Text style={error ? styles.error : styles.hint}>{error ?? 'They get a notification and have 7 days to accept.'}</Text>
      </View>
    );
  }

  const current = loaded?.q === q ? loaded : null;
  return (
    <View style={styles.gap}>
      <Text style={styles.label}>Who to invite</Text>
      <View style={styles.searchBox}>
        <Ionicons name="search" size={20} color={Brand.textMuted} />
        <TextInput
          style={styles.input}
          value={query}
          onChangeText={setQuery}
          placeholder="Search by name or username"
          placeholderTextColor={Brand.textFaint}
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={40}
          accessibilityLabel="Search people to invite"
        />
        {query ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Clear search" hitSlop={10} onPress={() => setQuery('')}>
            <Ionicons name="close-circle" size={20} color={Brand.textFaint} />
          </Pressable>
        ) : null}
      </View>
      {!searching ? (
        <Text style={styles.hint}>Type at least 2 letters of their name or username.</Text>
      ) : !current ? (
        <View style={styles.gap}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} height={48} radius={14} />
          ))}
        </View>
      ) : current.failed ? (
        <Text style={styles.error}>Could not search right now. Check your connection and try again.</Text>
      ) : current.people.length === 0 ? (
        <Text style={styles.hint}>{`No one found for “${q}”. Check the spelling, or ask them for their username.`}</Text>
      ) : (
        <View style={styles.list}>
          {current.people.slice(0, MAX_SHOWN).map((person) => {
            const onTeam = taken.has(person.id);
            return (
              <Pressable
                key={person.id}
                accessibilityRole="button"
                accessibilityState={{ disabled: onTeam }}
                disabled={onTeam}
                onPress={() => {
                  Feedback.select();
                  onPick(person);
                }}
                style={({ pressed }) => [styles.row, pressed && styles.pressed, onTeam && styles.off]}
              >
                <Avatar name={person.name} uri={person.avatarUrl} size={40} />
                <View style={styles.text}>
                  <Text style={styles.name}>{person.name}</Text>
                  <Text style={styles.username}>@{person.username}</Text>
                </View>
                {onTeam ? <Text style={styles.username}>On the team</Text> : <Ionicons name="add-circle-outline" size={22} color={Brand.primarySoft} />}
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  gap: { gap: Spacing.two },
  label: { ...Typography.caption, fontSize: 14, color: Brand.textMuted },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    height: 52,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Brand.border,
    backgroundColor: Brand.surface,
  },
  input: { flex: 1, ...Typography.body, color: Brand.text, paddingVertical: 0 },
  list: { borderRadius: Radius.lg, borderWidth: 1, borderColor: Brand.border, backgroundColor: Brand.surface, paddingHorizontal: Spacing.three },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingVertical: Spacing.two },
  picked: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Brand.border,
    backgroundColor: Brand.surface,
  },
  pickedError: { borderColor: Brand.error },
  pressed: { opacity: 0.6 },
  off: { opacity: 0.5 },
  text: { flex: 1, gap: 2 },
  name: { ...Typography.body, color: Brand.text },
  username: { ...Typography.caption, color: Brand.textMuted },
  change: { ...Typography.bodyStrong, fontSize: 15, color: Brand.primarySoft },
  hint: { ...Typography.caption, color: Brand.textFaint },
  error: { ...Typography.caption, color: Brand.error },
});

import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { useAuthToken } from '@/hooks/use-auth-token';
import { Feedback } from '@/lib/haptics';
import { ChatService } from '@/services/chat-service';
import type { Contact } from '@/types/chat';

interface ContactPickerProps {
  /** Ids shown with a tick (multi-select). Leave empty for a single-select "tap to start" list. */
  selected?: ReadonlySet<string>;
  onSelect: (contact: Contact) => void;
}

const DEBOUNCE_MS = 300;

interface Loaded {
  q: string;
  contacts: Contact[];
  failed: boolean;
}

/** Search box plus a list of people. Debounced; results for an older query are ignored. */
export function ContactPicker({ selected, onSelect }: ContactPickerProps) {
  const token = useAuthToken();
  const [query, setQuery] = useState('');
  const [loaded, setLoaded] = useState<Loaded | null>(null);

  const q = query.trim();

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      ChatService.contacts(token, q)
        .then((contacts) => !cancelled && setLoaded({ q, contacts, failed: false }))
        .catch(() => !cancelled && setLoaded({ q, contacts: [], failed: true }));
    }, DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [q, token]);

  const current = loaded?.q === q ? loaded : null;

  return (
    <View style={styles.container}>
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
          accessibilityLabel="Search people"
        />
      </View>

      {!current ? (
        <View style={styles.skeletons}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} height={48} radius={14} />
          ))}
        </View>
      ) : current.failed ? (
        <EmptyState icon="cloud-offline-outline" title="Could not load people" />
      ) : current.contacts.length === 0 ? (
        <EmptyState icon="sad-outline" title="No one found" />
      ) : (
        current.contacts.map((contact) => {
          const isSelected = selected?.has(contact.id) ?? false;
          return (
            <Pressable
              key={contact.id}
              accessibilityRole={selected ? 'checkbox' : 'button'}
              accessibilityState={selected ? { checked: isSelected } : undefined}
              onPress={() => {
                Feedback.select();
                onSelect(contact);
              }}
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}
            >
              <Avatar name={contact.name} size={44} />
              <View style={styles.text}>
                <Text style={styles.name}>{contact.name}</Text>
                <Text style={styles.username}>@{contact.username}</Text>
              </View>
              {selected ? (
                <Ionicons name={isSelected ? 'checkmark-circle' : 'ellipse-outline'} size={24} color={isSelected ? Brand.primary : Brand.textFaint} />
              ) : null}
            </Pressable>
          );
        })
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.two },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    height: 48,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.pill,
    backgroundColor: Brand.surfaceAlt,
  },
  input: { flex: 1, ...Typography.body, color: Brand.text, paddingVertical: 0 },
  skeletons: { gap: Spacing.three, paddingTop: Spacing.two },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingVertical: Spacing.two },
  pressed: { opacity: 0.6 },
  text: { flex: 1 },
  name: { ...Typography.body, color: Brand.text },
  username: { ...Typography.caption, color: Brand.textMuted },
});

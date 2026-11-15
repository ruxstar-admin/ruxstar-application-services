import { useState, type ReactNode } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { InputField } from '@/components/ui/InputField';
import { ListRow } from '@/components/ui/ListRow';
import { TextLink } from '@/components/ui/TextLink';
import { Brand, Spacing } from '@/constants/theme';
import type { AccountRow, AccountStatus } from '@/types/admin';
import { usePeopleSearch } from '../hooks/use-people-search';
import { consoleStyles } from './parts';

export { FilterButton, OptionList, OptionSheet } from '@/components/ui/Dropdown';

/** One scrolling row of `FilterButton`s, with a way to clear them all while any is set. */
export function FilterBar({ children, onClear, clearLabel = 'Clear filters' }: { children: ReactNode; onClear?: () => void; clearLabel?: string }) {
  return (
    <View style={styles.bar}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.buttons} keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
      {onClear ? (
        <View style={styles.clear}>
          <TextLink muted label={clearLabel} onPress={onClear} />
        </View>
      ) : null}
    </View>
  );
}

const Check = ({ on }: { on: boolean }) => (on ? <Ionicons name="checkmark" size={20} color={Brand.primarySoft} /> : <View />);

/** A person in search results. With a `note` (for example "Already staff") it can't be picked. */
export function PersonRow({ person, selected, note, onPress }: { person: AccountRow; selected?: boolean; note?: string | null; onPress: () => void }) {
  const name = person.name || person.username;
  return (
    <View style={note ? styles.blocked : undefined}>
      <ListRow
        leading={<Avatar name={name} uri={person.avatarUrl ?? undefined} size={40} />}
        title={person.name || 'No name'}
        subtitle={`@${person.username}`}
        right={note ? <Badge label={note} /> : <Check on={!!selected} />}
        onPress={note ? undefined : onPress}
      />
    </View>
  );
}

/**
 * A search box for people by phone number, @username or name, and the matches under it. `before` sits above
 * the matches (an "Anyone" row); `noteFor` marks people who can't be picked. Inside a sheet, pass `maxHeight`.
 */
export function PeopleSearch({
  onPick,
  selectedId,
  noteFor,
  status,
  before,
  autoFocus,
  maxHeight,
}: {
  onPick: (person: AccountRow) => void;
  selectedId?: string;
  noteFor?: (person: AccountRow) => string | null;
  status?: AccountStatus;
  before?: ReactNode;
  autoFocus?: boolean;
  maxHeight?: number;
}) {
  const [text, setText] = useState('');
  const { results, error, searching } = usePeopleSearch(text, status);

  const body = (
    <>
      {before}
      {results === null ? (
        <Text style={[consoleStyles.muted, styles.hint]}>Type at least 2 characters to search.</Text>
      ) : results.length === 0 ? (
        searching ? null : <Text style={[consoleStyles.muted, styles.hint]}>Nobody matches that.</Text>
      ) : (
        results.map((p) => <PersonRow key={p.id} person={p} selected={p.id === selectedId} note={noteFor?.(p)} onPress={() => onPick(p)} />)
      )}
    </>
  );

  return (
    <>
      <InputField
        value={text}
        onChangeText={setText}
        placeholder="Phone number, @username or name"
        accessibilityLabel="Find a person"
        autoFocus={autoFocus}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        accessory={searching ? <ActivityIndicator size="small" color={Brand.textMuted} /> : <Ionicons name="search" size={18} color={Brand.textMuted} />}
      />
      {error ? <ErrorBanner message={error} /> : null}
      {maxHeight ? (
        <ScrollView style={{ maxHeight }} keyboardShouldPersistTaps="handled">
          {body}
        </ScrollView>
      ) : (
        <View>{body}</View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  bar: { paddingBottom: Spacing.two },
  buttons: { gap: Spacing.two, paddingHorizontal: Spacing.three },
  clear: { alignItems: 'flex-end', paddingHorizontal: Spacing.three, paddingTop: Spacing.two },
  blocked: { opacity: 0.6 },
  hint: { paddingVertical: Spacing.two },
});

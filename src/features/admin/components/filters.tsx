import { useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { InputField } from '@/components/ui/InputField';
import { ListRow } from '@/components/ui/ListRow';
import { TextLink } from '@/components/ui/TextLink';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { Feedback } from '@/lib/haptics';
import type { AccountRow, AccountStatus } from '@/types/admin';
import { usePeopleSearch } from '../hooks/use-people-search';
import { consoleStyles } from './parts';

/** A dropdown button in a filter bar: what is picked, or the filter's name while nothing is. */
export function FilterButton({ label, active, onPress, icon }: { label: string; active: boolean; onPress: () => void; icon?: keyof typeof Ionicons.glyphMap }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint="Opens the choices"
      onPress={() => {
        Feedback.tap();
        onPress();
      }}
      style={({ pressed }) => [styles.button, active && styles.buttonActive, pressed && styles.pressed]}
    >
      {icon ? <Ionicons name={icon} size={14} color={active ? Brand.primarySoft : Brand.textMuted} /> : null}
      <Text style={[styles.buttonText, active && styles.buttonTextActive]} numberOfLines={1}>
        {label}
      </Text>
      <Ionicons name="chevron-down" size={14} color={active ? Brand.primarySoft : Brand.textMuted} />
    </Pressable>
  );
}

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

/** Choices in a sheet, the current one ticked. */
export function OptionList<K extends string>({ options, value, onPick }: { options: readonly { key: K; label: string }[]; value: K; onPick: (key: K) => void }) {
  return (
    <ScrollView style={styles.sheetList}>
      {options.map((o) => (
        <ListRow key={o.key || 'all'} title={o.label} right={<Check on={o.key === value} />} onPress={() => onPick(o.key)} />
      ))}
    </ScrollView>
  );
}

/** A sheet of choices for one filter; picking one closes it. */
export function OptionSheet<K extends string>({
  visible,
  title,
  options,
  value,
  onPick,
  onClose,
}: {
  visible: boolean;
  title: string;
  options: readonly { key: K; label: string }[];
  value: K;
  onPick: (key: K) => void;
  onClose: () => void;
}) {
  return (
    <BottomSheet visible={visible} onClose={onClose} title={title}>
      <OptionList
        options={options}
        value={value}
        onPick={(key) => {
          onPick(key);
          onClose();
        }}
      />
    </BottomSheet>
  );
}

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
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    height: 36,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.pill,
    backgroundColor: Brand.surfaceAlt,
    borderWidth: 1,
    borderColor: Brand.surfaceAlt,
  },
  buttonActive: { backgroundColor: 'rgba(180,92,242,0.18)', borderColor: 'rgba(180,92,242,0.45)' },
  buttonText: { ...Typography.caption, color: Brand.textMuted, maxWidth: 180 },
  buttonTextActive: { color: Brand.text, fontFamily: Typography.bodyStrong.fontFamily },
  pressed: { opacity: 0.7 },
  clear: { alignItems: 'flex-end', paddingHorizontal: Spacing.three, paddingTop: Spacing.two },
  sheetList: { maxHeight: 420 },
  blocked: { opacity: 0.6 },
  hint: { paddingVertical: Spacing.two },
});

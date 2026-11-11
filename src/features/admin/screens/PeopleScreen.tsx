import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { InputField } from '@/components/ui/InputField';
import { SegmentedTabs } from '@/components/ui/SegmentedTabs';
import { Spacing } from '@/constants/theme';
import type { AccountStatus } from '@/types/admin';
import { AccountResults } from '../components/AccountResults';
import { ConsoleScreen } from '../components/parts';

const FILTERS = [
  { key: 'all', label: 'Everyone' },
  { key: 'active', label: 'Active' },
  { key: 'locked', label: 'On hold' },
  { key: 'deleted', label: 'Deleted' },
] as const satisfies readonly { key: AccountStatus | 'all'; label: string }[];

/** Waits this long after the last keystroke before searching. */
const SEARCH_DELAY_MS = 350;

export function PeopleScreen() {
  const router = useRouter();
  const [text, setText] = useState('');
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<AccountStatus | 'all'>('all');

  useEffect(() => {
    const t = setTimeout(() => setQ(text.trim()), SEARCH_DELAY_MS);
    return () => clearTimeout(t);
  }, [text]);

  return (
    <ConsoleScreen title="People">
      <View style={styles.controls}>
        <InputField
          value={text}
          onChangeText={setText}
          placeholder="Name, @username or phone"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          accessibilityLabel="Search people"
        />
        <SegmentedTabs options={FILTERS} value={filter} onChange={setFilter} />
      </View>
      <AccountResults
        key={`${q}|${filter}`}
        q={q}
        status={filter === 'all' ? undefined : filter}
        onPick={(a) => router.push({ pathname: '/(admin)/account/[id]', params: { id: a.id } })}
      />
    </ConsoleScreen>
  );
}

const styles = StyleSheet.create({
  controls: { gap: Spacing.two, paddingHorizontal: Spacing.three, paddingBottom: Spacing.two },
});

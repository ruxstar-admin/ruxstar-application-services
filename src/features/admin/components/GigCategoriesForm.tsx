import { useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Checkbox } from '@/components/ui/Checkbox';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { InputField } from '@/components/ui/InputField';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { TextLink } from '@/components/ui/TextLink';
import { Brand, Spacing, Typography } from '@/constants/theme';
import { useAuthToken } from '@/hooks/use-auth-token';
import { IdempotentAttempt } from '@/lib/api-client';
import { Feedback } from '@/lib/haptics';
import { AdminService } from '@/services/admin-service';
import type { ModuleSettings } from '@/types/admin';
import type { GigCategory } from '@/types/gigs';
import { useCan } from '../access';
import { MAX_CATEGORIES, categoriesChanged, categoriesProblem, categoryKeyOf } from '../lib/gig-categories';
import { Fact, Facts, consoleStyles, errorText } from './parts';

/** The freelancer categories: renaming, hiding and adding. Keys already used stay for ever, so none can be removed. */
export function GigCategoriesForm({ m, onSaved }: { m: ModuleSettings & { gigsRules: NonNullable<ModuleSettings['gigsRules']> }; onSaved: (m: ModuleSettings) => void }) {
  const token = useAuthToken();
  const canManage = useCan('modules.manage');
  const saved = m.gigsRules.categories;
  const [list, setList] = useState<GigCategory[]>(() => saved.map((c) => ({ ...c })));
  const [adding, setAdding] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const attempt = useRef(new IdempotentAttempt());
  const problem = categoriesProblem(list);
  const changed = categoriesChanged(list, saved);
  const savedKeys = saved.map((c) => c.key);
  const set = (key: string, patch: Partial<GigCategory>) => setList((all) => all.map((c) => (c.key === key ? { ...c, ...patch } : c)));

  const add = () => {
    const label = adding.trim();
    if (!label) return;
    setList((all) => [...all, { key: categoryKeyOf(label, all.map((c) => c.key)), label, hidden: false }]);
    setAdding('');
  };

  const save = async () => {
    setBusy(true);
    setError(null);
    const categories = list.map((c) => ({ ...c, label: c.label.trim() }));
    try {
      const done = await AdminService.updateModule(token, m.module, { gigsRules: { categories } }, attempt.current.keyFor(categories));
      attempt.current.settle();
      Feedback.success();
      onSaved(done);
      if (done.gigsRules) setList(done.gigsRules.categories.map((c) => ({ ...c })));
    } catch (err) {
      Feedback.error();
      attempt.current.settle(err);
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  if (!canManage) {
    return (
      <>
        <Text style={styles.group}>Freelancer categories</Text>
        <Facts>
          {saved.map((c) => (
            <Fact key={c.key} label={c.label} value={c.hidden ? 'Hidden' : 'Showing'} />
          ))}
        </Facts>
      </>
    );
  }
  return (
    <>
      <Text style={styles.group}>Freelancer categories</Text>
      <Text style={consoleStyles.muted}>What freelancers pick for their profile and gigs, and customers filter by. Hidden ones can’t be picked for new gigs; gigs already in one stay.</Text>
      {list.map((c) => (
        <View key={c.key} style={styles.row}>
          <InputField label={savedKeys.includes(c.key) ? c.key : `${c.key} (new)`} value={c.label} onChangeText={(label) => set(c.key, { label })} maxLength={40} />
          <View style={styles.actions}>
            <Checkbox checked={c.hidden} onChange={(hidden) => set(c.key, { hidden })} accessibilityLabel={`Hide ${c.label}`}>
              <Text style={consoleStyles.muted}>Hidden</Text>
            </Checkbox>
            {savedKeys.includes(c.key) ? null : <TextLink muted label="Remove" onPress={() => setList((all) => all.filter((x) => x.key !== c.key))} />}
          </View>
        </View>
      ))}
      {list.length < MAX_CATEGORIES ? (
        <View style={styles.row}>
          <InputField label="New category" value={adding} onChangeText={setAdding} maxLength={40} placeholder="Like “Voice overs”" returnKeyType="done" onSubmitEditing={add} />
          {adding.trim() ? <TextLink label="Add it" onPress={add} /> : null}
        </View>
      ) : null}
      {changed && problem ? <Text style={styles.problem}>{problem}</Text> : null}
      <PrimaryButton label="Save categories" variant="outline" onPress={save} loading={busy} disabled={!changed || !!problem} />
      {error ? <ErrorBanner message={error} /> : null}
    </>
  );
}

const styles = StyleSheet.create({
  group: { ...Typography.overline, color: Brand.textMuted, marginTop: Spacing.two },
  row: { gap: Spacing.one },
  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  problem: { ...Typography.caption, color: Brand.error },
});

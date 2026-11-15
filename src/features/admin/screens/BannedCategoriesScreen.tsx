import { useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AsyncBoundary } from '@/components/ui/AsyncBoundary';
import { Badge } from '@/components/ui/Badge';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { InputField } from '@/components/ui/InputField';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { TextLink } from '@/components/ui/TextLink';
import { Brand, Spacing, Typography } from '@/constants/theme';
import { sportKeyOf } from '@/features/turf/lib/turf';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { useAuthToken } from '@/hooks/use-auth-token';
import { newIdempotencyKey } from '@/lib/api-client';
import { Feedback } from '@/lib/haptics';
import { ConsoleStoreService } from '@/services/store-service';
import type { BannedCategory } from '@/types/store';
import { useCan } from '../access';
import { Card, Note, consoleStyles, errorText } from '../components/parts';

const KEY = /^[a-z][a-z0-9_]{1,29}$/;
const MAX_WORDS = 100;

/** Comma or new-line separated, each 2 to 40 characters, without repeats in any case. */
function wordsOf(text: string): { words: string[]; bad: string | null } {
  const seen = new Set<string>();
  const words: string[] = [];
  for (const raw of text.split(/[,\n]/)) {
    const word = raw.trim().replace(/\s+/g, ' ');
    if (!word) continue;
    if (word.length < 2 || word.length > 40) return { words, bad: `“${word}” must be 2 to 40 characters.` };
    if (seen.has(word.toLowerCase())) continue;
    seen.add(word.toLowerCase());
    words.push(word);
  }
  if (!words.length) return { words, bad: 'Add at least one word.' };
  if (words.length > MAX_WORDS) return { words, bad: `Up to ${MAX_WORDS} words.` };
  return { words, bad: null };
}

/** Adding a banned category, or changing the name and words of `category`. */
function BannedSheet({ category, visible, onClose, onSaved }: { category: BannedCategory | null; visible: boolean; onClose: () => void; onSaved: (c: BannedCategory) => void }) {
  const token = useAuthToken();
  const [name, setName] = useState('');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const attempt = useRef(newIdempotencyKey());
  const [shown, setShown] = useState(visible);
  if (visible !== shown) {
    setShown(visible);
    if (visible) {
      setName(category?.name ?? '');
      setText(category?.words.join(', ') ?? '');
      setError(null);
    }
  }
  const key = category ? category.key : sportKeyOf(name);
  const nameOk = name.trim().length >= 2 && name.trim().length <= 60;
  const keyOk = KEY.test(key);
  const { words, bad } = wordsOf(text);

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const saved = category
        ? await ConsoleStoreService.updateBanned(token, category.key, { name: name.trim(), words })
        : await ConsoleStoreService.addBanned(token, { key, name: name.trim(), words }, attempt.current);
      attempt.current = newIdempotencyKey();
      Feedback.success();
      onSaved(saved);
    } catch (err) {
      Feedback.error();
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title={category ? `Change ${category.name}` : 'Ban a category'}>
      <InputField label="Name" value={name} onChangeText={setName} maxLength={60} placeholder="Like “Tobacco” or “Weapons”" autoFocus={!category} />
      <InputField
        label="Words"
        value={text}
        onChangeText={setText}
        multiline
        maxLength={4000}
        autoCapitalize="none"
        placeholder="cigarette, vape, hookah"
        hint={`Separate with commas. A product whose title, description or options use one as a whole word can’t be saved. ${words.length} of ${MAX_WORDS}.`}
        error={text.trim() && bad ? bad : undefined}
      />
      {!category && name.trim() && !keyOk ? <Text style={consoleStyles.muted}>Start the name with a letter.</Text> : null}
      {error ? <ErrorBanner message={error} /> : null}
      <PrimaryButton label={category ? 'Save' : 'Ban category'} loading={busy} disabled={!nameOk || !keyOk || !!bad} onPress={save} />
      <PrimaryButton label="Cancel" variant="outline" onPress={onClose} disabled={busy} />
    </BottomSheet>
  );
}

function BannedCard({ category, canManage, onEdit, onSaved }: { category: BannedCategory; canManage: boolean; onEdit: () => void; onSaved: (c: BannedCategory) => void }) {
  const token = useAuthToken();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = async () => {
    setBusy(true);
    setError(null);
    try {
      onSaved(await ConsoleStoreService.updateBanned(token, category.key, { active: !category.active }));
      Feedback.success();
    } catch (err) {
      Feedback.error();
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <View style={styles.head}>
        <View style={styles.flex}>
          <Text style={styles.name}>{category.name}</Text>
          <Text style={consoleStyles.muted} numberOfLines={3}>
            {category.words.join(', ')}
          </Text>
        </View>
        <Badge label={category.active ? 'Checked' : 'Turned off'} tone={category.active ? 'error' : 'neutral'} />
      </View>
      {canManage ? (
        <View style={styles.links}>
          <TextLink label="Change" onPress={onEdit} />
          <TextLink label={busy ? 'Saving…' : category.active ? 'Turn off' : 'Turn on'} muted={category.active} onPress={busy ? () => undefined : toggle} />
        </View>
      ) : null}
      {error ? <ErrorBanner message={error} /> : null}
    </Card>
  );
}

/** What local shops can't sell: each category's words are checked whenever a product is saved. */
export function BannedCategoriesScreen() {
  const token = useAuthToken();
  const canManage = useCan('modules.manage');
  const { data, loading, error, reload, setData } = useAsyncResource(() => ConsoleStoreService.banned(token), 'shop-banned');
  const [editing, setEditing] = useState<BannedCategory | null>(null);
  const [adding, setAdding] = useState(false);

  const saved = (c: BannedCategory) => {
    setData((prev) => {
      const list = prev ?? [];
      return list.some((x) => x.key === c.key) ? list.map((x) => (x.key === c.key ? c : x)) : [...list, c];
    });
    setEditing(null);
    setAdding(false);
  };

  return (
    <ScreenContainer title="Banned categories" footer={canManage ? <PrimaryButton label="Ban a category" onPress={() => setAdding(true)} /> : null}>
      <Note>Products already saved aren’t touched when you add words; take those down from Shop products. A turned-off category isn’t checked.</Note>
      <AsyncBoundary loading={loading} error={error} hasData={!!data} onRetry={reload} skeletonRows={4}>
        {data?.length === 0 ? <Text style={consoleStyles.muted}>Nothing banned yet.</Text> : null}
        {data?.map((c) => <BannedCard key={c.key} category={c} canManage={canManage} onEdit={() => setEditing(c)} onSaved={saved} />)}
      </AsyncBoundary>
      <BannedSheet
        category={editing}
        visible={adding || !!editing}
        onClose={() => {
          setAdding(false);
          setEditing(null);
        }}
        onSaved={saved}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  head: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  name: { ...Typography.bodyStrong, fontSize: 16, color: Brand.text },
  links: { flexDirection: 'row', gap: Spacing.four, marginTop: Spacing.two },
});

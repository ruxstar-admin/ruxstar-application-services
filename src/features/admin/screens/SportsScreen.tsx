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
import { useAsyncResource } from '@/hooks/use-async-resource';
import { useAuthToken } from '@/hooks/use-auth-token';
import { newIdempotencyKey } from '@/lib/api-client';
import { Feedback } from '@/lib/haptics';
import { AdminService } from '@/services/admin-service';
import { sportKeyOf } from '@/features/turf/lib/turf';
import type { ConsoleSport } from '@/types/turf';
import { useCan } from '../access';
import { Card, Note, consoleStyles, errorText } from '../components/parts';

const KEY = /^[a-z][a-z0-9_]{1,29}$/;

/** Adding a sport, or renaming `sport`. */
function SportSheet({ sport, visible, onClose, onSaved }: { sport: ConsoleSport | null; visible: boolean; onClose: () => void; onSaved: (s: ConsoleSport) => void }) {
  const token = useAuthToken();
  const [name, setName] = useState('');
  const [key, setKey] = useState('');
  const [keyEdited, setKeyEdited] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const attempt = useRef(newIdempotencyKey());
  const [shown, setShown] = useState(visible);
  if (visible !== shown) {
    setShown(visible);
    if (visible) {
      setName(sport?.name ?? '');
      setKey('');
      setKeyEdited(false);
      setError(null);
    }
  }
  const finalKey = sport ? sport.key : keyEdited ? key : sportKeyOf(name);
  const nameOk = name.trim().length >= 2 && name.trim().length <= 40;
  const keyOk = KEY.test(finalKey);

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const saved = sport
        ? await AdminService.updateSport(token, sport.key, { name: name.trim() })
        : await AdminService.addSport(token, { key: finalKey, name: name.trim() }, attempt.current);
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
    <BottomSheet visible={visible} onClose={onClose} title={sport ? `Rename ${sport.name}` : 'Add a sport'}>
      <InputField label="Name" value={name} onChangeText={setName} maxLength={40} placeholder="Like “Box cricket”" autoFocus />
      {sport ? null : (
        <InputField
          label="Key"
          value={finalKey}
          onChangeText={(v) => {
            setKeyEdited(true);
            setKey(v.toLowerCase());
          }}
          maxLength={30}
          autoCapitalize="none"
          autoCorrect={false}
          hint="Lower-case letters, digits and _; it can’t change later."
          error={finalKey && !keyOk ? 'Start with a letter; use 2 to 30 lower-case letters, digits or _.' : undefined}
        />
      )}
      {error ? <ErrorBanner message={error} /> : null}
      <PrimaryButton label={sport ? 'Save name' : 'Add sport'} loading={busy} disabled={!nameOk || !keyOk} onPress={save} />
      <PrimaryButton label="Cancel" variant="outline" onPress={onClose} disabled={busy} />
    </BottomSheet>
  );
}

function SportCard({ sport, canManage, onRename, onSaved }: { sport: ConsoleSport; canManage: boolean; onRename: () => void; onSaved: (s: ConsoleSport) => void }) {
  const token = useAuthToken();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = async () => {
    setBusy(true);
    setError(null);
    try {
      onSaved(await AdminService.updateSport(token, sport.key, { active: !sport.active }));
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
          <Text style={styles.name}>{sport.name}</Text>
          <Text style={consoleStyles.muted}>{sport.key}</Text>
        </View>
        <Badge label={sport.active ? 'Offered' : 'Turned off'} tone={sport.active ? 'success' : 'neutral'} />
      </View>
      {canManage ? (
        <View style={styles.links}>
          <TextLink label="Rename" onPress={onRename} />
          <TextLink label={busy ? 'Saving…' : sport.active ? 'Turn off' : 'Turn on'} muted={sport.active} onPress={busy ? () => undefined : toggle} />
        </View>
      ) : null}
      {error ? <ErrorBanner message={error} /> : null}
    </Card>
  );
}

/** The sports courts can offer: add one, rename it, or turn it off so new courts can't pick it. */
export function SportsScreen() {
  const token = useAuthToken();
  const canManage = useCan('modules.manage');
  const { data, loading, error, reload, setData } = useAsyncResource(() => AdminService.sports(token), 'sports');
  const [editing, setEditing] = useState<ConsoleSport | null>(null);
  const [adding, setAdding] = useState(false);

  const saved = (s: ConsoleSport) => {
    setData((prev) => {
      const list = prev ?? [];
      return list.some((x) => x.key === s.key) ? list.map((x) => (x.key === s.key ? s : x)) : [...list, s];
    });
    setEditing(null);
    setAdding(false);
  };

  return (
    <ScreenContainer title="Sports" footer={canManage ? <PrimaryButton label="Add a sport" onPress={() => setAdding(true)} /> : null}>
      <Note>A turned-off sport stays on the courts that have it, but owners can’t pick it for new courts and players can’t filter by it.</Note>
      <AsyncBoundary loading={loading} error={error} hasData={!!data} onRetry={reload} skeletonRows={5}>
        {data?.map((s) => <SportCard key={s.key} sport={s} canManage={canManage} onRename={() => setEditing(s)} onSaved={saved} />)}
      </AsyncBoundary>
      <SportSheet sport={editing} visible={adding || !!editing} onClose={() => {
          setAdding(false);
          setEditing(null);
        }} onSaved={saved} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  head: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  name: { ...Typography.bodyStrong, fontSize: 16, color: Brand.text },
  links: { flexDirection: 'row', gap: Spacing.four, marginTop: Spacing.two },
});

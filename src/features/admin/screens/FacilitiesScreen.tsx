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
import { ConsoleStaysService } from '@/services/stays-service';
import type { ConsoleFacility } from '@/types/stays';
import { useCan } from '../access';
import { Card, Note, consoleStyles, errorText } from '../components/parts';

const KEY = /^[a-z][a-z0-9_]{1,29}$/;

/** Adding a facility, or renaming `facility`. */
function FacilitySheet({ facility, visible, onClose, onSaved }: { facility: ConsoleFacility | null; visible: boolean; onClose: () => void; onSaved: (f: ConsoleFacility) => void }) {
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
      setName(facility?.name ?? '');
      setKey('');
      setKeyEdited(false);
      setError(null);
    }
  }
  const finalKey = facility ? facility.key : keyEdited ? key : sportKeyOf(name);
  const nameOk = name.trim().length >= 2 && name.trim().length <= 40;
  const keyOk = KEY.test(finalKey);

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const saved = facility
        ? await ConsoleStaysService.updateFacility(token, facility.key, { name: name.trim() })
        : await ConsoleStaysService.addFacility(token, { key: finalKey, name: name.trim() }, attempt.current);
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
    <BottomSheet visible={visible} onClose={onClose} title={facility ? `Rename ${facility.name}` : 'Add a facility'}>
      <InputField label="Name" value={name} onChangeText={setName} maxLength={40} placeholder="Like “Wi-Fi” or “Washing machine”" autoFocus />
      {facility ? null : (
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
      <PrimaryButton label={facility ? 'Save name' : 'Add facility'} loading={busy} disabled={!nameOk || !keyOk} onPress={save} />
      <PrimaryButton label="Cancel" variant="outline" onPress={onClose} disabled={busy} />
    </BottomSheet>
  );
}

function FacilityCard({ facility, canManage, onRename, onSaved }: { facility: ConsoleFacility; canManage: boolean; onRename: () => void; onSaved: (f: ConsoleFacility) => void }) {
  const token = useAuthToken();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = async () => {
    setBusy(true);
    setError(null);
    try {
      onSaved(await ConsoleStaysService.updateFacility(token, facility.key, { active: !facility.active }));
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
          <Text style={styles.name}>{facility.name}</Text>
          <Text style={consoleStyles.muted}>{facility.key}</Text>
        </View>
        <Badge label={facility.active ? 'Offered' : 'Turned off'} tone={facility.active ? 'success' : 'neutral'} />
      </View>
      {canManage ? (
        <View style={styles.links}>
          <TextLink label="Rename" onPress={onRename} />
          <TextLink label={busy ? 'Saving…' : facility.active ? 'Turn off' : 'Turn on'} muted={facility.active} onPress={busy ? () => undefined : toggle} />
        </View>
      ) : null}
      {error ? <ErrorBanner message={error} /> : null}
    </Card>
  );
}

/** The facilities a PG or hostel can list: add one, rename it, or turn it off so new listings can't pick it. */
export function FacilitiesScreen() {
  const token = useAuthToken();
  const canManage = useCan('modules.manage');
  const { data, loading, error, reload, setData } = useAsyncResource(() => ConsoleStaysService.facilities(token), 'stays-facilities');
  const [editing, setEditing] = useState<ConsoleFacility | null>(null);
  const [adding, setAdding] = useState(false);

  const saved = (f: ConsoleFacility) => {
    setData((prev) => {
      const list = prev ?? [];
      return list.some((x) => x.key === f.key) ? list.map((x) => (x.key === f.key ? f : x)) : [...list, f];
    });
    setEditing(null);
    setAdding(false);
  };

  return (
    <ScreenContainer title="Facilities" footer={canManage ? <PrimaryButton label="Add a facility" onPress={() => setAdding(true)} /> : null}>
      <Note>A turned-off facility stays on the properties that have it, but owners can’t pick it for new listings and tenants can’t filter by it.</Note>
      <AsyncBoundary loading={loading} error={error} hasData={!!data} onRetry={reload} skeletonRows={5}>
        {data?.map((f) => <FacilityCard key={f.key} facility={f} canManage={canManage} onRename={() => setEditing(f)} onSaved={saved} />)}
      </AsyncBoundary>
      <FacilitySheet
        facility={editing}
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

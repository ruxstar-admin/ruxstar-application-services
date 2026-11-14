import { useRef, useState } from 'react';
import { Text } from 'react-native';
import { AsyncBoundary } from '@/components/ui/AsyncBoundary';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { InputField } from '@/components/ui/InputField';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { PRIORITY } from '@/features/support/lib/support';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { useAuthToken } from '@/hooks/use-auth-token';
import { newIdempotencyKey } from '@/lib/api-client';
import { Feedback } from '@/lib/haptics';
import { SupportDeskService } from '@/services/support-service';
import type { SlaHours, SupportPriority, SupportSettings } from '@/types/support';
import { useCan } from '../access';
import { Note, consoleStyles, errorText } from '../components/parts';
import { shortDate } from '../labels';

const MAX_HOURS = 336;
const ORDER: SupportPriority[] = ['urgent', 'high', 'normal', 'low'];

type Draft = Record<SupportPriority, string>;
const draftOf = (hours: SlaHours): Draft => ({ urgent: String(hours.urgent), high: String(hours.high), normal: String(hours.normal), low: String(hours.low) });
const valid = (value: string) => /^\d+$/.test(value) && Number(value) >= 1 && Number(value) <= MAX_HOURS;

function Form({ settings, onSaved }: { settings: SupportSettings; onSaved: (next: SupportSettings) => void }) {
  const token = useAuthToken();
  const canManage = useCan('support.manage');
  const [draft, setDraft] = useState<Draft>(() => draftOf(settings.hours));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const key = useRef(newIdempotencyKey());

  const allValid = ORDER.every((p) => valid(draft[p]));
  const changed = ORDER.some((p) => draft[p] !== String(settings.hours[p]));

  const save = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const hours = Object.fromEntries(ORDER.map((p) => [p, Number(draft[p])])) as SlaHours;
      const next = await SupportDeskService.saveSettings(token, hours, key.current);
      key.current = newIdempotencyKey();
      Feedback.success();
      setSaved(true);
      setDraft(draftOf(next.hours));
      onSaved(next);
    } catch (err) {
      Feedback.error();
      setError(errorText(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Text style={consoleStyles.muted}>
        How long Ruxstar has to answer a ticket waiting on us, by its priority. A ticket past it shows as overdue. New times apply to the next reply each ticket waits for.
      </Text>
      {saved ? <Note>Saved.</Note> : null}
      {error ? <ErrorBanner message={error} /> : null}
      {ORDER.map((p) => (
        <InputField
          key={p}
          label={`${PRIORITY[p].label}, in hours`}
          value={draft[p]}
          onChangeText={(v) => setDraft((d) => ({ ...d, [p]: v.replace(/[^0-9]/g, '') }))}
          keyboardType="number-pad"
          maxLength={3}
          editable={canManage && !saving}
          error={valid(draft[p]) ? undefined : `1 to ${MAX_HOURS} hours.`}
        />
      ))}
      {settings.updatedAt ? <Text style={consoleStyles.muted}>{`Last changed ${shortDate(settings.updatedAt)}`}</Text> : null}
      {canManage ? <PrimaryButton label="Save" onPress={save} loading={saving} disabled={!allValid || !changed} /> : <Text style={consoleStyles.muted}>Changing these is not part of your access.</Text>}
    </>
  );
}

/** Reply-by times for help tickets, by priority. Defaults: urgent 2 hours, high 8, normal 24, low 72. */
export function SupportSettingsScreen() {
  const token = useAuthToken();
  const { data, loading, error, reload, setData } = useAsyncResource(() => SupportDeskService.settings(token));
  return (
    <ScreenContainer title="Reply-by times">
      <AsyncBoundary loading={loading} error={error} hasData={!!data} onRetry={reload} skeletonRows={4}>
        {data ? <Form settings={data} onSaved={setData} /> : null}
      </AsyncBoundary>
    </ScreenContainer>
  );
}

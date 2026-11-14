import { useRef, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { InputField } from '@/components/ui/InputField';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Brand, Spacing, Typography } from '@/constants/theme';
import { useAuthToken } from '@/hooks/use-auth-token';
import { newIdempotencyKey } from '@/lib/api-client';
import { Feedback } from '@/lib/haptics';
import { AdminService } from '@/services/admin-service';
import type { EventRuleSettings, ModuleSettings } from '@/types/admin';
import { useCan } from '../access';
import { Fact, Facts, consoleStyles, errorText } from './parts';

type Key = keyof EventRuleSettings;

/** The API's limits for each rule, and the words around each field. */
const FIELDS: { key: Key; min: number; max: number; label: string; unit: string; hint: string }[] = [
  {
    key: 'refundHours',
    min: 0,
    max: 720,
    label: 'Refunds stop this many hours before the start',
    unit: 'hours',
    hint: 'Customers can cancel for a full refund until then. Applies to every event at once, tickets already sold included. 0 lets them cancel right up to the start. Organisers can still choose no refunds.',
  },
  {
    key: 'waitlistHours',
    min: 1,
    max: 48,
    label: 'Hours to pay for seats from the waitlist',
    unit: 'hours',
    hint: 'When seats free up, the next person waiting gets this long to pay. Then the offer moves on.',
  },
  {
    key: 'maxTicketTypes',
    min: 1,
    max: 10,
    label: 'Ticket types per event',
    unit: '',
    hint: 'Like General, VIP and Early bird. Checked when an organiser saves an event; events that already have more keep them until edited.',
  },
  {
    key: 'maxQuestions',
    min: 0,
    max: 10,
    label: 'Questions per ticket holder',
    unit: '',
    hint: 'Extra questions an organiser can ask each person, like T-shirt size. 0 turns them off for new and edited events.',
  },
];

const textOf = (rules: EventRuleSettings) => Object.fromEntries(FIELDS.map((f) => [f.key, String(rules[f.key])])) as Record<Key, string>;
const wholeOf = (text: string) => (/^\d+$/.test(text.trim()) ? Number(text) : NaN);
const plural = (n: number, unit: string) => (unit ? `${n} ${n === 1 ? unit.slice(0, -1) : unit}` : String(n));

/** Events only: the refund window, the waitlist's time to pay, and how much an organiser can add to one event. */
export function EventRulesForm({ m, onSaved }: { m: ModuleSettings & { eventRules: EventRuleSettings }; onSaved: (m: ModuleSettings) => void }) {
  const token = useAuthToken();
  const canManage = useCan('modules.manage');
  const rules = m.eventRules;
  const [text, setText] = useState(() => textOf(rules));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const key = useRef(newIdempotencyKey());

  const values = Object.fromEntries(FIELDS.map((f) => [f.key, wholeOf(text[f.key])])) as Record<Key, number>;
  const errors = Object.fromEntries(
    FIELDS.map((f) => [f.key, values[f.key] >= f.min && values[f.key] <= f.max ? undefined : `Enter a whole number from ${f.min} to ${f.max}`]),
  ) as Record<Key, string | undefined>;
  const invalid = FIELDS.some((f) => errors[f.key]);
  const changes = Object.fromEntries(FIELDS.filter((f) => values[f.key] !== rules[f.key]).map((f) => [f.key, values[f.key]])) as Partial<EventRuleSettings>;
  const changed = Object.keys(changes).length > 0;

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const done = await AdminService.updateModule(token, m.module, { eventRules: changes }, key.current);
      key.current = newIdempotencyKey();
      Feedback.success();
      onSaved(done);
      if (done.eventRules) setText(textOf(done.eventRules));
    } catch (err) {
      Feedback.error();
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  if (!canManage) {
    return (
      <>
        <Text style={styles.group}>Event rules</Text>
        <Facts>
          {FIELDS.map((f) => (
            <Fact key={f.key} label={f.label} value={plural(rules[f.key], f.unit)} />
          ))}
        </Facts>
      </>
    );
  }
  return (
    <>
      <Text style={styles.group}>Event rules</Text>
      <Text style={consoleStyles.muted}>Every organiser&apos;s events follow these.</Text>
      {FIELDS.map((f) => (
        <InputField
          key={f.key}
          label={f.label}
          keyboardType="number-pad"
          value={text[f.key]}
          onChangeText={(value) => setText((all) => ({ ...all, [f.key]: value.replace(/\D/g, '') }))}
          hint={f.hint}
          error={errors[f.key]}
          maxLength={3}
        />
      ))}
      <PrimaryButton label="Save event rules" variant="outline" onPress={save} loading={busy} disabled={invalid || !changed} />
      {error ? <ErrorBanner message={error} /> : null}
    </>
  );
}

const styles = StyleSheet.create({
  group: { ...Typography.overline, color: Brand.textMuted, marginTop: Spacing.two },
});

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
import type { CoachingRuleSettings, EventRuleSettings, ModuleSettings } from '@/types/admin';
import { useCan } from '../access';
import { Fact, Facts, consoleStyles, errorText } from './parts';

type RulesKey = 'eventRules' | 'coachingRules';
type Rules = Record<string, number>;

/** One rule: the API's limits in the units typed, and `scale` turns those into what the API stores (100 for rupees to paise). */
interface Field {
  key: string;
  min: number;
  max: number;
  label: string;
  hint: string;
  show: (n: number) => string;
  scale?: number;
}

const count = (one: string, many: string) => (n: number) => `${n} ${n === 1 ? one : many}`;
const plain = (n: number) => String(n);

const SETS: Record<RulesKey, { title: string; intro: string; save: string; fields: Field[] }> = {
  eventRules: {
    title: 'Event rules',
    intro: 'Every organiser’s events follow these.',
    save: 'Save event rules',
    fields: [
      {
        key: 'refundHours',
        min: 0,
        max: 720,
        label: 'Refunds stop this many hours before the start',
        show: count('hour', 'hours'),
        hint: 'Customers can cancel for a full refund until then. Applies to every event at once, tickets already sold included. 0 lets them cancel right up to the start. Organisers can still choose no refunds.',
      },
      {
        key: 'waitlistHours',
        min: 1,
        max: 48,
        label: 'Hours to pay for seats from the waitlist',
        show: count('hour', 'hours'),
        hint: 'When seats free up, the next person waiting gets this long to pay. Then the offer moves on.',
      },
      {
        key: 'maxTicketTypes',
        min: 1,
        max: 10,
        label: 'Ticket types per event',
        show: plain,
        hint: 'Like General, VIP and Early bird. Checked when an organiser saves an event; events that already have more keep them until edited.',
      },
      {
        key: 'maxQuestions',
        min: 0,
        max: 10,
        label: 'Questions per ticket holder',
        show: plain,
        hint: 'Extra questions an organiser can ask each person, like T-shirt size. 0 turns them off for new and edited events.',
      },
    ],
  },
  coachingRules: {
    title: 'Coaching rules',
    intro: 'Every institute’s courses and batches follow these.',
    save: 'Save coaching rules',
    fields: [
      {
        key: 'certificatePercent',
        min: 1,
        max: 100,
        label: 'Attendance for a certificate (%)',
        show: (n) => `${n}%`,
        hint: 'Students who attend this share of the classes held get a certificate after the last class. Courses can set their own.',
      },
      {
        key: 'minimumHours',
        min: 1,
        max: 168,
        label: 'Hours before the first class the minimum is checked',
        show: count('hour', 'hours'),
        hint: 'A batch with fewer students than its minimum by then is cancelled and everyone gets a full refund.',
      },
      { key: 'maxBatchSize', min: 1, max: 1000, label: 'Seats in one batch', show: plain, hint: 'Checked when an institute saves a batch.' },
      { key: 'maxClasses', min: 1, max: 500, label: 'Classes in one batch', show: plain, hint: 'Extra classes included.' },
      { key: 'maxBatches', min: 1, max: 100, label: 'Batches in one course', show: plain, hint: 'Batches running or still to start.' },
      {
        key: 'maxDemoFee',
        min: 0,
        max: 10000,
        scale: 100,
        label: 'Most a demo class can cost (₹)',
        show: (n) => (n ? `₹${n}` : 'Free only'),
        hint: '0 means demo classes are free only.',
      },
      { key: 'maxDemoSeats', min: 1, max: 50, label: 'Demo students in one class', show: plain, hint: 'How many people can try the same class.' },
      {
        key: 'joinMinutes',
        min: 0,
        max: 120,
        label: 'Minutes before an online class its link shows',
        show: count('minute', 'minutes'),
        hint: 'Students see the meeting link from then until the class ends.',
      },
    ],
  },
};

const wholeOf = (text: string) => (/^\d+$/.test(text.trim()) ? Number(text) : NaN);

/** Ruxstar's rules for one module (`kind`), as a form for those who can manage modules and as facts for everyone else. */
export function RulesForm({ m, kind, onSaved }: { m: ModuleSettings; kind: RulesKey; onSaved: (m: ModuleSettings) => void }) {
  const token = useAuthToken();
  const canManage = useCan('modules.manage');
  const { title, intro, save: saveLabel, fields } = SETS[kind];
  const rules = (m[kind] ?? {}) as unknown as Rules;
  const shown = (r: Rules, f: Field) => (r[f.key] ?? 0) / (f.scale ?? 1);
  const textOf = (r: Rules) => Object.fromEntries(fields.map((f) => [f.key, String(shown(r, f))]));
  const [text, setText] = useState<Record<string, string>>(() => textOf(rules));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const key = useRef(newIdempotencyKey());

  const values = Object.fromEntries(fields.map((f) => [f.key, wholeOf(text[f.key] ?? '')]));
  const errors = Object.fromEntries(fields.map((f) => [f.key, values[f.key]! >= f.min && values[f.key]! <= f.max ? undefined : `Enter a whole number from ${f.min} to ${f.max}`]));
  const invalid = fields.some((f) => errors[f.key]);
  const changes = Object.fromEntries(fields.filter((f) => values[f.key] !== shown(rules, f)).map((f) => [f.key, values[f.key]! * (f.scale ?? 1)]));
  const changed = Object.keys(changes).length > 0;

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const patch = kind === 'eventRules' ? { eventRules: changes as Partial<EventRuleSettings> } : { coachingRules: changes as Partial<CoachingRuleSettings> };
      const done = await AdminService.updateModule(token, m.module, patch, key.current);
      key.current = newIdempotencyKey();
      Feedback.success();
      onSaved(done);
      const next = done[kind];
      if (next) setText(textOf(next as unknown as Rules));
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
        <Text style={styles.group}>{title}</Text>
        <Facts>
          {fields.map((f) => (
            <Fact key={f.key} label={f.label} value={f.show(shown(rules, f))} />
          ))}
        </Facts>
      </>
    );
  }
  return (
    <>
      <Text style={styles.group}>{title}</Text>
      <Text style={consoleStyles.muted}>{intro}</Text>
      {fields.map((f) => (
        <InputField
          key={f.key}
          label={f.label}
          keyboardType="number-pad"
          value={text[f.key]}
          onChangeText={(value) => setText((all) => ({ ...all, [f.key]: value.replace(/\D/g, '') }))}
          hint={f.hint}
          error={errors[f.key]}
          maxLength={String(f.max).length}
        />
      ))}
      <PrimaryButton label={saveLabel} variant="outline" onPress={save} loading={busy} disabled={invalid || !changed} />
      {error ? <ErrorBanner message={error} /> : null}
    </>
  );
}

const styles = StyleSheet.create({
  group: { ...Typography.overline, color: Brand.textMuted, marginTop: Spacing.two },
});

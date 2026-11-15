import { useRef, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { InputField } from '@/components/ui/InputField';
import { MultiChoiceChips } from '@/components/ui/MultiChoiceChips';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Brand, Spacing, Typography } from '@/constants/theme';
import { slotLengthText } from '@/features/turf/lib/turf';
import { useAuthToken } from '@/hooks/use-auth-token';
import { keepIdempotencyKey, newIdempotencyKey } from '@/lib/api-client';
import { Feedback } from '@/lib/haptics';
import { AdminService } from '@/services/admin-service';
import type { CoachingRuleSettings, EventRuleSettings, ModuleSettings } from '@/types/admin';
import type { StaysRuleSettings } from '@/types/stays';
import type { ShopRuleSettings } from '@/types/store';
import type { SlotMinutes, TurfRuleSettings } from '@/types/turf';
import { useCan } from '../access';
import { Fact, Facts, consoleStyles, errorText } from './parts';

type RulesKey = 'eventRules' | 'coachingRules' | 'turfRules' | 'staysRules' | 'shopRules';
type Rules = Record<string, number>;

const SLOT_LENGTHS: SlotMinutes[] = [30, 60, 90];
const LENGTH_CHIPS = SLOT_LENGTHS.map((m) => ({ key: String(m), label: slotLengthText(m) }));
const sameLengths = (a: readonly number[], b: readonly number[]) => a.length === b.length && a.every((n) => b.includes(n));

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
  turfRules: {
    title: 'Sports ground rules',
    intro: 'Every ground’s courts and bookings follow these. Bookings already made keep their refund rule.',
    save: 'Save ground rules',
    fields: [
      {
        key: 'refundFullHours',
        min: 0,
        max: 168,
        label: 'New grounds: full refund up to this many hours before',
        show: count('hour', 'hours'),
        hint: 'What a new ground starts with. Owners can change it between the limits below.',
      },
      {
        key: 'refundHalfHours',
        min: 0,
        max: 168,
        label: 'New grounds: part refund up to this many hours before',
        show: count('hour', 'hours'),
        hint: 'Between this and the full-refund hours, players get the share below back. No more than the full-refund hours.',
      },
      { key: 'halfPercent', min: 0, max: 100, label: 'Part refund (%)', show: (n) => `${n}%`, hint: '0 turns the middle step off.' },
      { key: 'minFullHours', min: 0, max: 168, label: 'Owners’ full-refund hours: at least', show: count('hour', 'hours'), hint: 'The fewest hours an owner can pick.' },
      { key: 'maxFullHours', min: 0, max: 168, label: 'Owners’ full-refund hours: at most', show: count('hour', 'hours'), hint: 'The most hours an owner can pick.' },
      { key: 'maxRepeatWeeks', min: 1, max: 52, label: 'Weeks in a weekly booking', show: count('week', 'weeks'), hint: 'The first week included. 1 turns weekly booking off.' },
      { key: 'holdMinutes', min: 5, max: 60, label: 'Minutes slots are held while paying', show: count('minute', 'minutes'), hint: 'Unpaid slots go back after this.' },
      { key: 'maxSlots', min: 1, max: 48, label: 'Back-to-back slots in one booking', show: plain, hint: 'Like 3 one-hour slots for a 3-hour game.' },
      { key: 'bookAheadDays', min: 1, max: 180, label: 'Days ahead the first slot can be', show: count('day', 'days'), hint: 'Later weeks of a weekly booking can go past this.' },
      { key: 'maxGrounds', min: 1, max: 100, label: 'Grounds per business', show: plain, hint: 'Checked when an owner adds a ground.' },
      { key: 'maxCourts', min: 1, max: 100, label: 'Courts per ground', show: plain, hint: 'Checked when an owner adds a court.' },
      { key: 'maxAddOns', min: 0, max: 30, label: 'Add-ons per court', show: plain, hint: 'Like a ball or bibs. 0 turns add-ons off for new and edited courts.' },
    ],
  },
  staysRules: {
    title: 'PG and hostel rules',
    intro: 'Every property’s rooms and reservations follow these. Reservations already made keep their refund rule.',
    save: 'Save stay rules',
    fields: [
      {
        key: 'refundDays',
        min: 0,
        max: 60,
        label: 'Full refund up to this many days before move-in',
        show: count('day', 'days'),
        hint: 'What every property gives at least. Owners can only be stricter, up to the most below.',
      },
      { key: 'maxRefundDays', min: 0, max: 60, label: 'Owners’ refund days: at most', show: count('day', 'days'), hint: 'The strictest rule an owner can pick. At least the days above.' },
      {
        key: 'objectionHours',
        min: 1,
        max: 168,
        label: 'Hours a tenant can object after moving in',
        show: count('hour', 'hours'),
        hint: 'The owner is paid once this passes with no objection.',
      },
      { key: 'maxMonths', min: 1, max: 12, label: 'Months paid with a reservation', show: count('month', 'months'), hint: 'PG and co-living, the first month included.' },
      { key: 'maxNights', min: 1, max: 90, label: 'Nights in one reservation', show: count('night', 'nights'), hint: 'Hostels.' },
      { key: 'holdMinutes', min: 5, max: 60, label: 'Minutes beds are held while paying', show: count('minute', 'minutes'), hint: 'Unpaid beds go back after this.' },
      { key: 'bookAheadDays', min: 1, max: 180, label: 'Days ahead move-in can be', show: count('day', 'days'), hint: 'From today.' },
      { key: 'maxProperties', min: 1, max: 100, label: 'Properties per business', show: plain, hint: 'Checked when an owner adds a property.' },
      { key: 'maxRooms', min: 1, max: 500, label: 'Rooms per property', show: plain, hint: 'Checked when an owner adds a room.' },
      { key: 'maxBeds', min: 1, max: 24, label: 'Beds per room', show: plain, hint: 'Checked when an owner saves a room.' },
    ],
  },
  shopRules: {
    title: 'Local shop rules',
    intro: 'Every shop’s products and orders follow these. Orders already placed keep their return days.',
    save: 'Save shop rules',
    fields: [
      {
        key: 'returnDays',
        min: 1,
        max: 30,
        label: 'Days after delivery to ask for a return',
        show: count('day', 'days'),
        hint: 'For shops that take returns. Shops can also choose no returns.',
      },
      {
        key: 'releaseHours',
        min: 1,
        max: 720,
        label: 'Hours after delivery the shop is paid',
        show: count('hour', 'hours'),
        hint: 'Or when the return window ends, whichever is later.',
      },
      {
        key: 'acceptHours',
        min: 1,
        max: 72,
        label: 'Hours a shop has to accept a paid order',
        show: count('hour', 'hours'),
        hint: 'Not accepted by then: cancelled and refunded in full.',
      },
      { key: 'holdMinutes', min: 5, max: 60, label: 'Minutes the checkout stays open', show: count('minute', 'minutes'), hint: 'Stock is only taken once it’s paid.' },
      { key: 'maxOptions', min: 1, max: 2, label: 'Options per product', show: plain, hint: 'Like size and colour.' },
      { key: 'maxValues', min: 1, max: 30, label: 'Values of one option', show: plain, hint: 'Like S, M, L and XL.' },
      { key: 'maxVariants', min: 1, max: 100, label: 'Combinations on one product', show: plain, hint: 'Checked when a shop saves a product.' },
      { key: 'maxProducts', min: 1, max: 5000, label: 'Products per shop', show: plain, hint: 'Checked when a shop adds a product.' },
      { key: 'maxLines', min: 1, max: 50, label: 'Different items in one order', show: plain, hint: 'Lines in the cart.' },
      { key: 'maxQuantity', min: 1, max: 100, label: 'Of one item in one order', show: plain, hint: 'The most of one size or colour.' },
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
  const savedLengths = kind === 'turfRules' ? (m.turfRules?.slotLengths ?? []) : [];
  const [lengths, setLengths] = useState<number[]>(() => [...savedLengths]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const key = useRef(newIdempotencyKey());

  const values = Object.fromEntries(fields.map((f) => [f.key, wholeOf(text[f.key] ?? '')]));
  const errors = Object.fromEntries(fields.map((f) => [f.key, values[f.key]! >= f.min && values[f.key]! <= f.max ? undefined : `Enter a whole number from ${f.min} to ${f.max}`]));
  const lengthsChanged = kind === 'turfRules' && !sameLengths(lengths, savedLengths);
  const invalid = fields.some((f) => errors[f.key]) || (kind === 'turfRules' && !lengths.length);
  const changes = Object.fromEntries(fields.filter((f) => values[f.key] !== shown(rules, f)).map((f) => [f.key, values[f.key]! * (f.scale ?? 1)]));
  const changed = Object.keys(changes).length > 0 || lengthsChanged;

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const patch =
        kind === 'eventRules'
          ? { eventRules: changes as Partial<EventRuleSettings> }
          : kind === 'coachingRules'
            ? { coachingRules: changes as Partial<CoachingRuleSettings> }
            : kind === 'staysRules'
              ? { staysRules: changes as Partial<StaysRuleSettings> }
              : kind === 'shopRules'
                ? { shopRules: changes as Partial<ShopRuleSettings> }
                : { turfRules: { ...changes, ...(lengthsChanged ? { slotLengths: [...lengths].sort((a, b) => a - b) as SlotMinutes[] } : {}) } as Partial<TurfRuleSettings> };
      const done = await AdminService.updateModule(token, m.module, patch, key.current);
      key.current = newIdempotencyKey();
      Feedback.success();
      onSaved(done);
      const next = done[kind];
      if (next) setText(textOf(next as unknown as Rules));
      if (done.turfRules) setLengths([...done.turfRules.slotLengths]);
    } catch (err) {
      Feedback.error();
      if (!keepIdempotencyKey(err)) key.current = newIdempotencyKey();
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
          {kind === 'turfRules' ? <Fact label="Slot lengths" value={savedLengths.map(slotLengthText).join(', ')} /> : null}
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
      {kind === 'turfRules' ? (
        <>
          <Text style={styles.label}>Slot lengths courts can use</Text>
          <MultiChoiceChips options={LENGTH_CHIPS} value={lengths.map(String)} onChange={(v) => setLengths(v.map(Number))} />
          <Text style={consoleStyles.muted}>{lengths.length ? 'Courts already set up keep their length.' : 'Pick at least one.'}</Text>
        </>
      ) : null}
      <PrimaryButton label={saveLabel} variant="outline" onPress={save} loading={busy} disabled={invalid || !changed} />
      {error ? <ErrorBanner message={error} /> : null}
    </>
  );
}

const styles = StyleSheet.create({
  group: { ...Typography.overline, color: Brand.textMuted, marginTop: Spacing.two },
  label: { ...Typography.bodyStrong, fontSize: 15, color: Brand.text },
});

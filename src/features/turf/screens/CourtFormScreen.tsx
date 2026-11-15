import { useRef, useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { AsyncBoundary } from '@/components/ui/AsyncBoundary';
import { ChoiceChips } from '@/components/ui/ChoiceChips';
import { ConfirmSheet } from '@/components/ui/ConfirmSheet';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { InputField } from '@/components/ui/InputField';
import { KeyedSelectField } from '@/components/ui/KeyedSelectField';
import { MultiChoiceChips } from '@/components/ui/MultiChoiceChips';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { TextLink } from '@/components/ui/TextLink';
import { ToggleRow } from '@/components/ui/ToggleRow';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { errorText } from '@/features/events/lib/messages';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { useAuthToken } from '@/hooks/use-auth-token';
import { keepIdempotencyKey, newIdempotencyKey } from '@/lib/api-client';
import { Feedback } from '@/lib/haptics';
import { TurfService, VendorTurfService } from '@/services/turf-service';
import type { SlotMinutes, Sport, TurfRules, VendorGround } from '@/types/turf';
import { AddOnsEditor, CLOSE_TIMES, OPEN_TIMES, PricesEditor } from '../components/PriceEditors';
import { courtDraftOf, courtErrors, emptyCourt, hasCourtErrors, toCourtInput, type CourtDraft, type DayHours } from '../lib/forms';
import { slotLengthText, WEEK_ORDER, WEEKDAY_SHORT } from '../lib/turf';

const WEEKDAY_NAME = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function DayRow({ day, hours, onChange }: { day: number; hours: DayHours; onChange: (h: DayHours) => void }) {
  return (
    <View style={styles.day}>
      <View style={styles.dayHead}>
        <Text style={styles.dayName}>{WEEKDAY_NAME[day]}</Text>
        <Text style={styles.small}>{hours.open ? 'Open' : 'Closed'}</Text>
        <Switch
          value={hours.open}
          onValueChange={(open) => {
            Feedback.select();
            onChange({ ...hours, open });
          }}
          trackColor={{ false: Brand.disabled, true: Brand.primaryDeep }}
          thumbColor={Brand.text}
          accessibilityLabel={`Open on ${WEEKDAY_NAME[day]}`}
        />
      </View>
      {hours.open ? (
        <View style={styles.pair}>
          <View style={styles.half}>
            <KeyedSelectField label="Opens" value={hours.from} options={OPEN_TIMES} onChange={(v) => onChange({ ...hours, from: v })} />
          </View>
          <View style={styles.half}>
            <KeyedSelectField label="Closes" value={hours.to} options={CLOSE_TIMES} onChange={(v) => onChange({ ...hours, to: v })} />
          </View>
        </View>
      ) : null}
    </View>
  );
}

function Form({ rules, sports, ground, courtId }: { rules: TurfRules; sports: Sport[]; ground: VendorGround; courtId?: string }) {
  const router = useRouter();
  const token = useAuthToken();
  const court = courtId ? ground.courtList.find((c) => c.id === courtId) : undefined;
  const [draft, setDraft] = useState<CourtDraft>(() => (court ? courtDraftOf(court) : emptyCourt(ground.courtList.length + 1, rules.slotLengths.includes(60) ? 60 : rules.slotLengths[0])));
  const [shown, setShown] = useState(false);
  const [busy, setBusy] = useState<'save' | 'delete' | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const attempt = useRef(newIdempotencyKey());
  const errors = courtErrors(draft, rules);
  const set = <K extends keyof CourtDraft>(key: K, value: CourtDraft[K]) => setDraft((d) => ({ ...d, [key]: value }));
  const setDay = (day: number, h: DayHours) => setDraft((d) => ({ ...d, hours: d.hours.map((x, i) => (i === day ? h : x)) }));
  const shownErrors = shown ? errors : { peaks: {}, addOns: {} };
  const sportChips = sports.map((s) => ({ key: s.key, label: s.name }));
  for (const key of draft.sports) if (!sports.some((s) => s.key === key)) sportChips.push({ key, label: court?.sports.find((s) => s.key === key)?.name ?? key });
  const lengthChips = rules.slotLengths.map((m) => ({ key: String(m), label: slotLengthText(m) }));

  const copyMonday = () => {
    Feedback.tap();
    setDraft((d) => ({ ...d, hours: d.hours.map(() => ({ ...d.hours[1]! })) }));
  };

  const save = async () => {
    setShown(true);
    if (hasCourtErrors(errors)) {
      Feedback.error();
      return;
    }
    setBusy('save');
    setFailure(null);
    try {
      const body = toCourtInput(draft);
      if (court) await VendorTurfService.updateCourt(token, court.id, body);
      else await VendorTurfService.addCourt(token, ground.id, body, { idempotencyKey: attempt.current });
      Feedback.success();
      router.back();
    } catch (e) {
      Feedback.error();
      setFailure(errorText(e));
      if (!keepIdempotencyKey(e)) attempt.current = newIdempotencyKey();
    } finally {
      setBusy(null);
    }
  };

  const remove = async () => {
    if (!court) return;
    setBusy('delete');
    try {
      await VendorTurfService.removeCourt(token, court.id);
      Feedback.success();
      setDeleting(false);
      router.back();
    } catch (e) {
      Feedback.error();
      setDeleting(false);
      setFailure(errorText(e));
    } finally {
      setBusy(null);
    }
  };

  const footer = <PrimaryButton label={court ? 'Save court' : 'Add court'} loading={busy === 'save'} onPress={save} />;

  return (
    <ScreenContainer title={court ? 'Edit court' : 'New court'} footer={footer}>
      <InputField label="Court name" value={draft.name} onChangeText={(v) => set('name', v)} maxLength={40} placeholder="Like “Court 1” or “5-a-side A”" error={shownErrors.name} />

      <Text style={styles.label}>Sports played here</Text>
      <MultiChoiceChips options={sportChips} value={draft.sports} onChange={(v) => set('sports', v)} />
      {shownErrors.sports ? <Text style={styles.error}>{shownErrors.sports}</Text> : null}

      <Text style={styles.label}>Slot length</Text>
      <View style={styles.bleed}>
        <ChoiceChips options={lengthChips} value={String(draft.slotMinutes)} onChange={(v) => set('slotMinutes', Number(v) as SlotMinutes)} />
      </View>
      <Text style={styles.hint}>Players book one or more slots in a row, up to {rules.maxSlots} at a time.</Text>

      <Text style={styles.label}>Opening hours</Text>
      {WEEK_ORDER.map((d) => (
        <DayRow key={d} day={d} hours={draft.hours[d]!} onChange={(h) => setDay(d, h)} />
      ))}
      <TextLink label={`Use ${WEEKDAY_SHORT[1]}’s hours every day`} onPress={copyMonday} />
      {shownErrors.hours ? <Text style={styles.error}>{shownErrors.hours}</Text> : null}

      <Text style={styles.label}>Prices</Text>
      <PricesEditor draft={draft} errors={shownErrors} onChange={(changes) => setDraft((d) => ({ ...d, ...changes }))} />

      <AddOnsEditor addOns={draft.addOns} errors={shownErrors.addOns} max={rules.maxAddOns} onChange={(v) => set('addOns', v)} />
      {shownErrors.more ? <Text style={styles.error}>{shownErrors.more}</Text> : null}

      <ToggleRow
        title="Pause bookings"
        subtitle="Players still see the court but can’t book it. Bookings already made stay."
        icon="pause-circle-outline"
        value={draft.paused}
        onValueChange={(v) => set('paused', v)}
      />

      {failure ? <ErrorBanner message={failure} /> : null}
      {court ? <TextLink muted label="Delete this court" onPress={() => setDeleting(true)} /> : null}

      <ConfirmSheet
        visible={deleting}
        title="Delete this court?"
        message={`${draft.name || 'This court'} will be removed from the ground. A court with bookings still to come can’t be deleted; pause it instead.`}
        confirmLabel="Delete"
        loading={busy === 'delete'}
        onConfirm={remove}
        onCancel={() => setDeleting(false)}
      />
    </ScreenContainer>
  );
}

/** Adding a court to `groundId`, or changing `courtId`: sports, slot length, hours, prices and add-ons. */
export function CourtFormScreen({ groundId, courtId }: { groundId: string; courtId?: string }) {
  const token = useAuthToken();
  const rules = useAsyncResource(() => TurfService.rules(token), 'rules');
  const sports = useAsyncResource(() => TurfService.sports(token), 'sports');
  const ground = useAsyncResource(() => VendorTurfService.get(token, groundId), groundId);
  const ready = rules.data && sports.data && ground.data;
  return ready ? (
    <Form rules={rules.data!} sports={sports.data!} ground={ground.data!} courtId={courtId} />
  ) : (
    <ScreenContainer title={courtId ? 'Edit court' : 'New court'}>
      <AsyncBoundary
        loading={rules.loading || sports.loading || ground.loading}
        error={rules.error ?? sports.error ?? ground.error}
        hasData={false}
        onRetry={() => {
          rules.reload();
          sports.reload();
          ground.reload();
        }}
        skeletonRows={5}
      >
        {null}
      </AsyncBoundary>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  bleed: { marginHorizontal: -Spacing.three },
  label: { ...Typography.bodyStrong, fontSize: 15, color: Brand.text },
  hint: { ...Typography.caption, color: Brand.textMuted },
  small: { ...Typography.caption, color: Brand.textMuted },
  error: { ...Typography.caption, color: Brand.error },
  pair: { flexDirection: 'row', gap: Spacing.two },
  half: { flex: 1 },
  day: { gap: Spacing.two, padding: Spacing.three, borderRadius: Radius.lg, backgroundColor: Brand.surface, borderWidth: 1, borderColor: Brand.border },
  dayHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  dayName: { ...Typography.bodyStrong, fontSize: 15, color: Brand.text, flex: 1 },
});

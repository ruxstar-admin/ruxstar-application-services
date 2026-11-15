import { useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { VendorBoard } from '@/components/booking';
import { AsyncBoundary } from '@/components/ui/AsyncBoundary';
import { ChoiceChips } from '@/components/ui/ChoiceChips';
import { ConfirmSheet } from '@/components/ui/ConfirmSheet';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { InputField } from '@/components/ui/InputField';
import { KeyedSelectField } from '@/components/ui/KeyedSelectField';
import { MultiChoiceChips } from '@/components/ui/MultiChoiceChips';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ReasonSheet } from '@/components/ui/ReasonSheet';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { TextLink } from '@/components/ui/TextLink';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { dayLabel, istDays } from '@/features/events/lib/events';
import { errorText, isOffline } from '@/features/events/lib/messages';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { useAuthToken } from '@/hooks/use-auth-token';
import { newIdempotencyKey } from '@/lib/api-client';
import type { BoardColumn, BoardRow } from '@/lib/booking/board';
import { istDayKey } from '@/lib/booking/days';
import { Feedback } from '@/lib/haptics';
import { CoachingService, VendorCoachingService } from '@/services/coaching-service';
import { TeamService } from '@/services/team-service';
import type { CoachingRules, VendorBatch, VendorCourse } from '@/types/coaching';
import type { TeamMember } from '@/types/team';
import { Section } from '../components/Parts';
import { batchChanges, batchDraftOf, batchErrors, emptyBatch, scheduleLocked, toBatchInput, type BatchDraft } from '../lib/forms';
import { GRID_ROWS, LENGTHS, gridCells, gridColumns, hoursOf, lengthLabel, planClasses, planLine, scheduleText, toggleSlot } from '../lib/schedule';

const LENGTH_CHIPS = LENGTHS.map((m) => ({ key: String(m), label: lengthLabel(m) }));
/** Start dates offered, from today. */
const START_DAYS = 366;

function Form({ rules, course, batch, coaches }: { rules: CoachingRules; course: VendorCourse; batch?: VendorBatch; coaches: TeamMember[] }) {
  const router = useRouter();
  const token = useAuthToken();
  const [openedAt] = useState(Date.now);
  const today = istDayKey(openedAt);
  const days = useMemo(() => istDays(START_DAYS, openedAt), [openedAt]);
  const [draft, setDraft] = useState<BatchDraft>(() => (batch ? batchDraftOf(batch) : emptyBatch(days[1]?.key ?? today)));
  const [shown, setShown] = useState(false);
  const [busy, setBusy] = useState<'save' | 'cancel' | 'delete' | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [gridProblem, setGridProblem] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const attempt = useRef(newIdempotencyKey());

  const locked = scheduleLocked(batch ?? null);
  const taken = batch ? batch.enrolled + batch.held : 0;
  const errors = batchErrors(draft, rules, course.mode, today, taken, !locked);
  const err = (field: string) => (shown ? errors[field] : undefined);
  const set = <K extends keyof BatchDraft>(key: K, value: BatchDraft[K]) => setDraft((d) => ({ ...d, [key]: value }));

  const columns = useMemo(() => gridColumns(draft.slots), [draft.slots]);
  const cells = useMemo(() => gridCells(draft.slots, columns), [draft.slots, columns]);
  const count = Number(draft.classes) || 0;
  const plan = useMemo(() => planClasses(draft.slots, draft.startDate, Math.min(count, rules.maxClasses)), [draft.slots, draft.startDate, count, rules.maxClasses]);
  const coachChips = coaches.map((m) => ({ key: m.person.id, label: m.person.name }));

  const tap = (row: BoardRow, column: BoardColumn) => {
    const next = toggleSlot(draft.slots, Number(row.key), column.key, draft.minutes);
    setGridProblem(next.problem);
    if (next.problem) {
      Feedback.error();
      return;
    }
    Feedback.select();
    set('slots', next.slots);
  };

  const save = async () => {
    setShown(true);
    if (Object.keys(errors).length) {
      Feedback.error();
      return;
    }
    setBusy('save');
    setFailure(null);
    try {
      if (batch) {
        const changes = batchChanges(draft, batch, course.mode);
        if (Object.keys(changes).length) await VendorCoachingService.updateBatch(token, batch.id, changes);
      } else {
        await VendorCoachingService.addBatch(token, course.id, toBatchInput(draft, course.mode), { idempotencyKey: attempt.current });
      }
      Feedback.success();
      router.back();
    } catch (e) {
      Feedback.error();
      setFailure(errorText(e));
      if (!isOffline(e)) attempt.current = newIdempotencyKey();
    } finally {
      setBusy(null);
    }
  };

  const cancelBatch = async (reason: string) => {
    if (!batch) return;
    setBusy('cancel');
    setFailure(null);
    try {
      await VendorCoachingService.cancelBatch(token, batch.id, reason, { idempotencyKey: newIdempotencyKey() });
      Feedback.success();
      setCancelling(false);
      router.back();
    } catch (e) {
      Feedback.error();
      setFailure(errorText(e));
    } finally {
      setBusy(null);
    }
  };

  const remove = async () => {
    if (!batch) return;
    setBusy('delete');
    try {
      await VendorCoachingService.removeBatch(token, batch.id);
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

  const footer = <PrimaryButton label={batch ? 'Save batch' : 'Add batch'} loading={busy === 'save'} onPress={save} />;

  return (
    <ScreenContainer title={batch ? 'Edit batch' : 'New batch'} footer={footer}>
      <Text style={styles.lead}>{course.title}</Text>
      <InputField label="Batch name" value={draft.name} onChangeText={(v) => set('name', v)} maxLength={60} placeholder="Like “Morning batch” or “Weekend”" error={err('name')} />
      <View style={styles.pair}>
        <View style={styles.half}>
          <InputField label="Course fee (₹)" value={draft.fee} onChangeText={(v) => set('fee', v)} keyboardType="decimal-pad" hint="Paid in full when they enrol" error={err('fee')} />
        </View>
        <View style={styles.half}>
          <InputField label="Seats" value={draft.capacity} onChangeText={(v) => set('capacity', v)} keyboardType="number-pad" maxLength={4} hint={taken ? `${taken} taken` : undefined} error={err('capacity')} />
        </View>
      </View>
      <InputField
        label="Fewest students to run (optional)"
        value={draft.minimum}
        onChangeText={(v) => set('minimum', v)}
        keyboardType="number-pad"
        maxLength={4}
        hint={`If fewer enrol by ${rules.minimumHours} hours before the first class, the batch is cancelled and everyone gets a full refund.`}
        error={err('minimum')}
      />

      <Section title="Weekly timetable" />
      {locked ? (
        <View style={styles.locked}>
          <Text style={styles.strong}>{scheduleText(draft.slots)}</Text>
          <Text style={styles.hint}>{`Starts ${dayLabel(draft.startDate)} · ${batch?.classes ?? 0} classes. Students have enrolled, so the timetable and dates stay as they are. Move or add single classes from Today’s classes.`}</Text>
        </View>
      ) : (
        <>
          <Text style={styles.label}>How long is each class?</Text>
          <View style={styles.bleed}>
            <ChoiceChips options={LENGTH_CHIPS} value={String(draft.minutes)} onChange={(v) => set('minutes', Number(v))} />
          </View>
          <Text style={styles.hint}>Tap a day and a start time to add a class. Tap it again to take it off.</Text>
          <VendorBoard rows={GRID_ROWS} columns={columns} cells={cells} onCellPress={tap} corner="Day" />
          {gridProblem ? <Text style={styles.error}>{gridProblem}</Text> : null}
          {draft.slots.length ? <Text style={styles.strong} accessibilityLiveRegion="polite">{scheduleText(draft.slots)}</Text> : null}
          {err('slots') ? <Text style={styles.error}>{err('slots')}</Text> : null}

          <View style={styles.pair}>
            <View style={styles.half}>
              <KeyedSelectField label="First day" value={draft.startDate} options={days} onChange={(v) => set('startDate', v)} fallback={dayLabel} error={err('startDate')} />
            </View>
            <View style={styles.half}>
              <InputField label="Number of classes" value={draft.classes} onChangeText={(v) => set('classes', v)} keyboardType="number-pad" maxLength={3} error={err('classes')} />
            </View>
          </View>
          <View style={styles.plan}>
            <Text style={styles.strong}>{planLine(plan, dayLabel)}</Text>
            {plan.length ? <Text style={styles.hint}>{`${hoursOf(plan)} hours of teaching. Times are India time.`}</Text> : null}
          </View>
        </>
      )}

      {course.mode === 'online' ? (
        <InputField
          label="Meeting link"
          value={draft.onlineLink}
          onChangeText={(v) => set('onlineLink', v)}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          hint={`Students see it ${rules.joinMinutes} minutes before each class.`}
          error={err('onlineLink')}
        />
      ) : null}

      <Section title="Coaches" />
      {coachChips.length ? (
        <>
          <MultiChoiceChips options={coachChips} value={draft.coachIds} onChange={(v) => set('coachIds', v)} />
          <Text style={styles.hint}>They see this batch in Classes and can do what you allowed them on your team.</Text>
        </>
      ) : (
        <Text style={styles.hint}>Invite coaches to your team with “See their batches and students”, then pick them here. You can always teach it yourself.</Text>
      )}
      {failure ? <ErrorBanner message={failure} /> : null}

      {batch && (batch.status === 'open' || batch.status === 'full') ? (
        taken === 0 ? (
          <TextLink muted label="Delete this batch" onPress={() => setDeleting(true)} />
        ) : (
          <TextLink muted label="Cancel this batch" onPress={() => setCancelling(true)} />
        )
      ) : null}

      <ReasonSheet
        visible={cancelling}
        title="Cancel this batch?"
        message={`Every class is cancelled and all ${batch?.enrolled ?? 0} students get a full refund, platform fee included. This can’t be undone.`}
        prompt="Tell students and parents why"
        placeholder="Like “Not enough students for this timing”"
        confirmLabel="Cancel batch"
        loading={busy === 'cancel'}
        failure={cancelling ? failure : null}
        onConfirm={cancelBatch}
        onCancel={() => setCancelling(false)}
      />
      <ConfirmSheet
        visible={deleting}
        title="Delete this batch?"
        message={`${batch?.name ?? 'It'} and its classes are deleted. No one has enrolled yet.`}
        confirmLabel="Delete"
        loading={busy === 'delete'}
        onConfirm={remove}
        onCancel={() => setDeleting(false)}
      />
    </ScreenContainer>
  );
}

/** Adding a batch to a course, or changing one: fee, seats, the weekly timetable on a grid, dates, meeting link and coaches. */
export function BatchFormScreen() {
  const token = useAuthToken();
  const { id, batchId } = useLocalSearchParams<{ id: string; batchId?: string }>();
  const rules = useAsyncResource(() => CoachingService.rules(token), 'rules');
  const course = useAsyncResource(() => VendorCoachingService.get(token, id), id);
  const businessId = course.data?.business.id ?? '';
  const team = useAsyncResource(() => (businessId ? TeamService.get(token, businessId) : Promise.resolve(null)), businessId);
  const batch = batchId ? course.data?.batches.find((b) => b.id === batchId) : undefined;
  const coaches = (team.data?.members ?? []).filter((m) => m.status === 'active' && m.permissions.includes('classes.view'));
  const ready = rules.data && course.data && (team.data !== undefined || team.error) && (!batchId || batch);

  return ready ? (
    <Form rules={rules.data!} course={course.data!} batch={batch} coaches={coaches} />
  ) : (
    <ScreenContainer title={batchId ? 'Edit batch' : 'New batch'}>
      <AsyncBoundary
        loading={rules.loading || course.loading || team.loading}
        error={rules.error ?? course.error}
        hasData={false}
        onRetry={() => {
          rules.reload();
          course.reload();
          team.reload();
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
  lead: { ...Typography.caption, fontSize: 14, color: Brand.textMuted },
  label: { ...Typography.bodyStrong, fontSize: 15, color: Brand.text },
  strong: { ...Typography.bodyStrong, fontSize: 15, color: Brand.text },
  hint: { ...Typography.caption, color: Brand.textMuted },
  error: { ...Typography.caption, color: Brand.error },
  pair: { flexDirection: 'row', gap: Spacing.two },
  half: { flex: 1 },
  locked: { gap: Spacing.one, padding: Spacing.three, borderRadius: Radius.lg, backgroundColor: Brand.surface, borderWidth: 1, borderColor: Brand.border },
  plan: { gap: 2, padding: Spacing.three, borderRadius: Radius.md, backgroundColor: Brand.surfaceAlt },
});

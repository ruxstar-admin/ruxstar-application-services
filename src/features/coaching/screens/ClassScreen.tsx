import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Roster } from '@/components/booking';
import { AsyncBoundary } from '@/components/ui/AsyncBoundary';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { ListRow } from '@/components/ui/ListRow';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ReasonSheet } from '@/components/ui/ReasonSheet';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { whenLine } from '@/features/events/lib/events';
import { errorText, isOffline } from '@/features/events/lib/messages';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { useAuthToken } from '@/hooks/use-auth-token';
import { newIdempotencyKey } from '@/lib/api-client';
import { Feedback } from '@/lib/haptics';
import { TeachService } from '@/services/coaching-service';
import type { ClassRoster, DeskBatchDetail } from '@/types/coaching';
import { ClassTimeSheet, type ClassTime } from '../components/ClassTimeSheet';
import { Notice } from '../components/Parts';
import { useNow } from '../hooks/use-now';
import { changeText } from '../lib/classes';
import { MARK_EARLY_MS, marksOf, tickedOf, unsaved } from '../lib/desk';

function ClassView({ roster, batch, onRoster, reloadBatch }: { roster: ClassRoster; batch: DeskBatchDetail | null; onRoster: (r: ClassRoster) => void; reloadBatch: () => void }) {
  const router = useRouter();
  const token = useAuthToken();
  const now = useNow();
  const cls = roster.class;
  const [ticked, setTicked] = useState(() => tickedOf(roster.students));
  const [saving, setSaving] = useState(false);
  const [sheet, setSheet] = useState<'move' | 'cancel' | null>(null);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [sheetFailure, setSheetFailure] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(newIdempotencyKey);

  const cancelled = cls.status === 'cancelled';
  const upcoming = !cancelled && Date.parse(cls.startsAt) > now;
  const canChange = !!batch?.can.reschedule && upcoming;
  const dirty = unsaved(roster.students, ticked);
  const change = changeText(cls);

  const save = async () => {
    setSaving(true);
    setFailure(null);
    try {
      const fresh = await TeachService.mark(token, cls.id, marksOf(roster.students, ticked));
      Feedback.success();
      onRoster(fresh);
      setTicked(tickedOf(fresh.students));
    } catch (err) {
      Feedback.error();
      setFailure(errorText(err));
    } finally {
      setSaving(false);
    }
  };

  const run = async (call: (key: string) => Promise<unknown>) => {
    setBusy(true);
    setSheetFailure(null);
    try {
      await call(attempt);
      Feedback.success();
      setSheet(null);
      setAttempt(newIdempotencyKey());
      reloadBatch();
      onRoster(await TeachService.roster(token, cls.id));
    } catch (err) {
      Feedback.error();
      setSheetFailure(errorText(err));
      if (!isOffline(err)) setAttempt(newIdempotencyKey());
    } finally {
      setBusy(false);
    }
  };

  const move = (time: ClassTime) =>
    run((key) => TeachService.moveClass(token, cls.id, { startsAt: time.startsAt, minutes: time.minutes, ...(time.reason ? { reason: time.reason } : {}) }, { idempotencyKey: key }));
  const cancel = (reason: string) => run((key) => TeachService.cancelClass(token, cls.id, reason, { idempotencyKey: key }));

  const hint = cancelled
    ? null
    : roster.canMark
      ? null
      : Date.parse(cls.startsAt) - MARK_EARLY_MS > now
        ? 'Attendance opens 30 minutes before the class.'
        : batch && !batch.can.attendance
          ? 'The owner hasn’t given you attendance. You can see who’s in the class.'
          : 'Attendance is closed for this class.';
  const footer = roster.canMark && roster.students.length ? <PrimaryButton label={dirty ? 'Save attendance' : 'Saved'} loading={saving} disabled={!dirty} onPress={save} /> : null;
  const minutes = Math.round((Date.parse(cls.endsAt) - Date.parse(cls.startsAt)) / 60_000);

  return (
    <ScreenContainer title={roster.batch.name} footer={footer}>
      <View style={styles.head}>
        <View style={styles.headText}>
          <Text style={styles.title}>{whenLine(cls.startsAt, cls.endsAt)}</Text>
          <Text style={styles.muted}>{batch ? `${batch.course.title} · ${roster.batch.name}` : roster.batch.name}</Text>
        </View>
        {cls.extra ? <Badge label="Extra" tone="accent" /> : null}
      </View>
      {change ? <Notice tone={cancelled ? 'error' : 'warning'} text={change} /> : null}
      {cls.marked ? <Notice tone="success" text={`Attendance saved: ${cls.present} of ${roster.students.length} present. You can change it.`} /> : null}
      {hint ? <Text style={styles.muted}>{hint}</Text> : null}

      {cancelled ? null : roster.students.length ? (
        <Roster
          people={roster.students.map((s) => ({ key: s.orderId, name: s.name, subtitle: [s.kind === 'demo' ? 'Demo class' : null, s.child ? 'Child' : null].filter(Boolean).join(' · ') || undefined }))}
          ticked={ticked}
          onChange={setTicked}
          disabled={!roster.canMark}
        />
      ) : (
        <EmptyState icon="people-outline" title="No students yet" message="Paid students and demo bookings for this class show up here." />
      )}
      {failure ? <ErrorBanner message={failure} onRetry={save} /> : null}

      {canChange ? (
        <View style={styles.actions}>
          <ListRow icon="swap-horizontal-outline" title="Move this class" subtitle="Everyone is told the new time" onPress={() => setSheet('move')} />
          <ListRow icon="close-circle-outline" title="Cancel this class" subtitle="No refund for one class; add an extra class to make it up" destructive onPress={() => setSheet('cancel')} />
        </View>
      ) : null}
      {batch ? <ListRow icon="layers-outline" title="Open the batch" subtitle="Every class, students, messages and files" onPress={() => router.push({ pathname: '/(customer)/teach/batch/[id]', params: { id: batch.id } })} /> : null}

      {sheet === 'move' ? (
        <ClassTimeSheet
          visible
          title="Move this class"
          start={cls.startsAt}
          minutes={minutes}
          withReason
          busy={busy}
          failure={sheetFailure}
          confirmLabel="Move class"
          onClose={() => setSheet(null)}
          onConfirm={move}
        />
      ) : null}
      <ReasonSheet
        visible={sheet === 'cancel'}
        title="Cancel this class?"
        message="Every student and parent is told why. Demo students booked into it are refunded."
        prompt="Tell them why"
        placeholder="Like “Teacher unwell, we’ll add a class next week”"
        confirmLabel="Cancel class"
        loading={busy}
        failure={sheetFailure}
        onConfirm={cancel}
        onCancel={() => setSheet(null)}
      />
    </ScreenContainer>
  );
}

/** One class: its students with a tick each and "Mark all present", saving attendance, and moving or cancelling it. */
export function ClassScreen() {
  const token = useAuthToken();
  const { id } = useLocalSearchParams<{ id: string }>();
  const roster = useAsyncResource(() => TeachService.roster(token, id), id);
  const batchId = roster.data?.batch.id ?? '';
  const batch = useAsyncResource(() => (batchId ? TeachService.batch(token, batchId) : Promise.resolve(null)), batchId);

  return roster.data ? (
    <ClassView key={roster.data.class.id} roster={roster.data} batch={batch.data ?? null} onRoster={roster.setData} reloadBatch={batch.reload} />
  ) : (
    <ScreenContainer title="Class">
      <AsyncBoundary loading={roster.loading} error={roster.error} hasData={false} onRetry={roster.reload} skeletonRows={5}>
        {null}
      </AsyncBoundary>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', gap: Spacing.three, alignItems: 'flex-start' },
  headText: { flex: 1, gap: 2 },
  title: { ...Typography.heading, color: Brand.text },
  muted: { ...Typography.caption, fontSize: 14, color: Brand.textMuted },
  actions: { paddingHorizontal: Spacing.three, borderRadius: Radius.lg, backgroundColor: Brand.surface, borderWidth: 1, borderColor: Brand.border, overflow: 'hidden', marginTop: Spacing.two },
});

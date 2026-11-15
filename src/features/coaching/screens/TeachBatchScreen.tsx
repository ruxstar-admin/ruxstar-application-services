import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AsyncBoundary } from '@/components/ui/AsyncBoundary';
import { Badge } from '@/components/ui/Badge';
import { ListRow } from '@/components/ui/ListRow';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { TextLink } from '@/components/ui/TextLink';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { whenLine } from '@/features/events/lib/events';
import { errorText } from '@/features/events/lib/messages';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { useAuthToken } from '@/hooks/use-auth-token';
import { useRefetchOnFocus } from '@/hooks/use-refetch-on-focus';
import { keepIdempotencyKey, newIdempotencyKey } from '@/lib/api-client';
import { Feedback } from '@/lib/haptics';
import { TeachService } from '@/services/coaching-service';
import type { DeskBatchDetail, DeskClass } from '@/types/coaching';
import { ClassTimeSheet, type ClassTime } from '../components/ClassTimeSheet';
import { Section } from '../components/Parts';
import { useNow } from '../hooks/use-now';
import { BATCH_STATUS } from '../lib/coaching';
import { markLine } from '../lib/desk';

/** Classes shown before "Show all". */
const FIRST_CLASSES = 8;

function DeskClassRow({ cls, index, now, onPress }: { cls: DeskClass; index: number; now: number; onPress: () => void }) {
  const cancelled = cls.status === 'cancelled';
  const mark = markLine(cls, now);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[`Class ${index}`, whenLine(cls.startsAt, cls.endsAt), mark.text].join(', ')}
      onPress={() => {
        Feedback.tap();
        onPress();
      }}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <Text style={styles.index}>{index}</Text>
      <View style={styles.text}>
        <Text style={[styles.when, cancelled && styles.struck]}>{whenLine(cls.startsAt, cls.endsAt)}</Text>
        <Text style={[styles.small, { color: mark.colour }]}>{mark.text}</Text>
      </View>
      {cls.extra ? <Badge label="Extra" tone="accent" /> : null}
      <Ionicons name="chevron-forward" size={16} color={Brand.textFaint} />
    </Pressable>
  );
}

function BatchView({ batch, onBatch }: { batch: DeskBatchDetail; onBatch: (b: DeskBatchDetail) => void }) {
  const router = useRouter();
  const token = useAuthToken();
  const now = useNow();
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(newIdempotencyKey);
  const [all, setAll] = useState(false);
  const status = BATCH_STATUS[batch.status];
  const running = batch.status !== 'cancelled' && batch.status !== 'ended';
  const upcomingFirst = batch.classes.findIndex((c) => Date.parse(c.endsAt) > now);
  const start = all ? 0 : Math.max(0, upcomingFirst === -1 ? batch.classes.length - FIRST_CLASSES : upcomingFirst - 1);
  const shown = all ? batch.classes : batch.classes.slice(start, start + FIRST_CLASSES);
  const last = batch.classes.at(-1);
  const minutes = batch.slots[0]?.minutes ?? 60;

  const addClass = async (time: ClassTime) => {
    setBusy(true);
    setFailure(null);
    try {
      const fresh = await TeachService.addClass(token, batch.id, time.startsAt, time.minutes, { idempotencyKey: attempt });
      Feedback.success();
      onBatch(fresh);
      setAdding(false);
      setAttempt(newIdempotencyKey());
    } catch (err) {
      Feedback.error();
      setFailure(errorText(err));
      if (!keepIdempotencyKey(err)) setAttempt(newIdempotencyKey());
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScreenContainer title={batch.name}>
      <View style={styles.head}>
        <View style={styles.headText}>
          <Text style={styles.title}>{batch.course.title}</Text>
          <Text style={styles.muted}>{`${batch.name} · ${batch.business.name}`}</Text>
          <Text style={styles.muted}>{batch.schedule}</Text>
          <Text style={styles.muted}>{`${batch.students} ${batch.students === 1 ? 'student' : 'students'}${batch.course.mode === 'online' ? ' · online' : ''}`}</Text>
        </View>
        <Badge label={batch.role === 'coach' ? 'Coach' : status.label} tone={batch.role === 'coach' ? 'neutral' : status.tone} />
      </View>

      <View style={styles.links}>
        <ListRow icon="people-outline" title="Students" subtitle="Attendance so far, and who’s on track for the certificate" onPress={() => router.push({ pathname: '/(customer)/teach/batch/[id]/students', params: { id: batch.id } })} />
        <ListRow
          icon="megaphone-outline"
          title="Messages"
          subtitle={batch.can.message ? 'Tell the whole batch something' : 'What was sent to the batch'}
          onPress={() => router.push({ pathname: '/(customer)/teach/batch/[id]/messages', params: { id: batch.id } })}
        />
        <ListRow
          icon="folder-open-outline"
          title="Notes and files"
          subtitle={batch.can.materials ? 'Share notes, worksheets and links' : 'What was shared with the batch'}
          onPress={() => router.push({ pathname: '/(customer)/teach/batch/[id]/materials', params: { id: batch.id } })}
        />
        {batch.can.reschedule && running ? <ListRow icon="add-circle-outline" title="Add an extra class" subtitle="To make up a cancelled one, or revision" onPress={() => setAdding(true)} /> : null}
      </View>

      <Section title={`Classes · ${batch.classes.filter((c) => c.status !== 'cancelled').length}`} />
      <View style={styles.classes}>
        {shown.map((c) => (
          <DeskClassRow key={c.id} cls={c} index={batch.classes.indexOf(c) + 1} now={now} onPress={() => router.push({ pathname: '/(customer)/teach/class/[id]', params: { id: c.id } })} />
        ))}
      </View>
      {batch.classes.length > FIRST_CLASSES ? <TextLink label={all ? 'Show fewer' : `Show all ${batch.classes.length} classes`} onPress={() => setAll((v) => !v)} /> : null}

      {adding ? (
        <ClassTimeSheet
          visible
          title="Add an extra class"
          start={last ? new Date(Date.parse(last.startsAt) + 7 * 86_400_000).toISOString() : new Date(now + 86_400_000).toISOString()}
          minutes={minutes}
          busy={busy}
          failure={failure}
          confirmLabel="Add class"
          onClose={() => setAdding(false)}
          onConfirm={addClass}
        />
      ) : null}
    </ScreenContainer>
  );
}

/** One batch for the owner or a coach: every class with attendance, and the batch's students, messages and files. */
export function TeachBatchScreen() {
  const token = useAuthToken();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, loading, error, reload, setData } = useAsyncResource(() => TeachService.batch(token, id), id);
  useRefetchOnFocus(useCallback(() => reload(), [reload]));
  return data ? (
    <BatchView batch={data} onBatch={setData} />
  ) : (
    <ScreenContainer title="Batch">
      <AsyncBoundary loading={loading} error={error} hasData={false} onRetry={reload} skeletonRows={5}>
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
  links: { paddingHorizontal: Spacing.three, borderRadius: Radius.lg, backgroundColor: Brand.surface, borderWidth: 1, borderColor: Brand.border, overflow: 'hidden' },
  classes: { gap: Spacing.one },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, minHeight: 56, paddingVertical: Spacing.two, paddingHorizontal: Spacing.three, borderRadius: Radius.md, backgroundColor: Brand.surface },
  pressed: { opacity: 0.8 },
  index: { ...Typography.caption, width: 22, textAlign: 'center', color: Brand.textFaint },
  text: { flex: 1, gap: 2 },
  when: { ...Typography.body, fontSize: 14, color: Brand.text },
  struck: { textDecorationLine: 'line-through', color: Brand.textMuted },
  small: { ...Typography.caption, color: Brand.textMuted },
});

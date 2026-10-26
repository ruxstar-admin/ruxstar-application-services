import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AsyncBoundary } from '@/components/ui/AsyncBoundary';
import { EmptyState } from '@/components/ui/EmptyState';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { ToggleRow } from '@/components/ui/ToggleRow';
import { Brand, Spacing, Typography } from '@/constants/theme';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { useAuthToken } from '@/hooks/use-auth-token';
import { formatDateTime } from '@/lib/dates';
import { Feedback } from '@/lib/haptics';
import { CoachingService } from '@/services/coaching-service';
import type { BatchRoster } from '@/types/coaching';

function Roster({ roster }: { roster: BatchRoster }) {
  const router = useRouter();
  const token = useAuthToken();
  const [present, setPresent] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const session = roster.nextSession;

  const toggle = (id: string, on: boolean) => setPresent((prev) => (on ? [...prev, id] : prev.filter((p) => p !== id)));

  const save = async () => {
    if (!session) return;
    setSaving(true);
    try {
      await CoachingService.saveAttendance(token, roster.batch.id, session.id, present);
      Feedback.success();
      router.back();
    } catch {
      Feedback.error();
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenContainer title={roster.courseTitle} footer={roster.students.length > 0 ? <PrimaryButton label="Save attendance" onPress={save} loading={saving} /> : undefined}>
      <Text style={styles.meta}>{`${roster.batch.label} · ${roster.batch.enrolled}/${roster.batch.capacity} students`}</Text>
      {session ? <Text style={styles.section}>{`Attendance · ${formatDateTime(session.at)}`}</Text> : null}
      {roster.students.map((student) => (
        <ToggleRow key={student.id} title={student.name} subtitle={present.includes(student.id) ? 'Present' : 'Absent'} value={present.includes(student.id)} onValueChange={(on) => toggle(student.id, on)} />
      ))}
      {roster.students.length === 0 ? <EmptyState icon="people-outline" title="No students yet" message="Students appear here once they enrol and pay." /> : null}
    </ScreenContainer>
  );
}

/** A batch's students and a present/absent switch for the next session. */
export function BatchRosterScreen() {
  const token = useAuthToken();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, loading, error, reload } = useAsyncResource(() => CoachingService.roster(token, id));

  return data ? (
    <Roster roster={data} />
  ) : (
    <ScreenContainer title="Batch">
      <AsyncBoundary loading={loading} error={error} hasData={false} onRetry={reload} skeletonRows={4}>
        {null}
      </AsyncBoundary>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  meta: { ...Typography.caption, color: Brand.textMuted },
  section: { ...Typography.overline, color: Brand.textMuted, marginTop: Spacing.four },
});

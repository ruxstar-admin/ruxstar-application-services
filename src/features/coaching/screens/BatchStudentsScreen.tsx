import { useCallback } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { AsyncBoundary } from '@/components/ui/AsyncBoundary';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { useAuthToken } from '@/hooks/use-auth-token';
import { useRefetchOnFocus } from '@/hooks/use-refetch-on-focus';
import { TeachService } from '@/services/coaching-service';
import type { DeskStudent } from '@/types/coaching';

function StudentRow({ student }: { student: DeskStudent }) {
  const onTrack = student.held === 0 || student.percent >= student.certificateAt;
  return (
    <View style={styles.row} accessible accessibilityLabel={`${student.name}, attended ${student.attended} of ${student.held}, ${student.percent}%`}>
      <Avatar name={student.name} size={40} />
      <View style={styles.text}>
        <Text style={styles.name}>{student.name}</Text>
        <Text style={styles.small}>{student.held ? `Attended ${student.attended} of ${student.held} · ${student.percent}%` : 'No classes held yet'}</Text>
      </View>
      {student.child ? <Badge label="Child" tone="neutral" /> : null}
      {student.held ? <Badge label={onTrack ? 'On track' : `Below ${student.certificateAt}%`} tone={onTrack ? 'success' : 'warning'} /> : null}
    </View>
  );
}

/** The batch's paid students with their attendance so far, and who's below what the certificate needs. */
export function BatchStudentsScreen() {
  const token = useAuthToken();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, loading, error, reload } = useAsyncResource(() => TeachService.students(token, id).then((p) => p.items), id);
  useRefetchOnFocus(useCallback(() => reload(), [reload]));
  const students = data ?? [];
  return (
    <ScreenContainer title="Students">
      <AsyncBoundary loading={loading} error={error} hasData={!!data} onRetry={reload} skeletonRows={5}>
        {students.length ? (
          <>
            <Text style={styles.small}>{`${students.length} ${students.length === 1 ? 'student' : 'students'}. Certificates go to those at ${students[0]!.certificateAt}% or more after the last class.`}</Text>
            {students.map((s) => (
              <StudentRow key={s.orderId} student={s} />
            ))}
          </>
        ) : (
          <EmptyState icon="people-outline" title="No students yet" message="Students show up here once they’ve paid." />
        )}
      </AsyncBoundary>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, minHeight: 64, padding: Spacing.three, borderRadius: Radius.lg, backgroundColor: Brand.surface, borderWidth: 1, borderColor: Brand.border },
  text: { flex: 1, gap: 2 },
  name: { ...Typography.bodyStrong, fontSize: 16, color: Brand.text },
  small: { ...Typography.caption, color: Brand.textMuted },
});

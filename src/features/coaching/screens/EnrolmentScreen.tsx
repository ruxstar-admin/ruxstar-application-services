import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { AsyncBoundary } from '@/components/ui/AsyncBoundary';
import { Badge } from '@/components/ui/Badge';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { StatusTimeline } from '@/components/ui/StatusTimeline';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { CancelOrder } from '@/features/money/components/CancelOrder';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { useAuthToken } from '@/hooks/use-auth-token';
import { useRefetchOnFocus } from '@/hooks/use-refetch-on-focus';
import { formatDateTime } from '@/lib/dates';
import { formatRupees } from '@/lib/money';
import { CoachingService } from '@/services/coaching-service';
import type { Enrolment, SessionStatus } from '@/types/coaching';

const SESSION_LABEL: Record<SessionStatus, string> = { upcoming: 'Upcoming', attended: 'Attended', missed: 'Missed', cancelled: 'Cancelled by coach' };

function EnrolmentView({ enrolment, onChanged }: { enrolment: Enrolment; onChanged: () => void }) {
  return (
    <>
      <View style={styles.head}>
        <View style={styles.flex}>
          <Text style={styles.title}>{enrolment.courseTitle}</Text>
          <Text style={styles.meta}>{`${enrolment.batchLabel} · ${enrolment.schedule}`}</Text>
        </View>
        <Badge label={enrolment.status === 'active' ? 'Enrolled' : 'Cancelled'} tone={enrolment.status === 'active' ? 'success' : 'error'} />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Fee paid</Text>
        <Text style={styles.fee}>{formatRupees(enrolment.fee)}</Text>
        <Text style={enrolment.refundable ? styles.refundable : styles.meta}>
          {enrolment.status === 'cancelled'
            ? 'This enrolment was cancelled.'
            : enrolment.refundable
              ? `Full refund available until the first session on ${formatDateTime(enrolment.startsAt)}.`
              : 'The first session has started, so this fee is no longer refundable.'}
        </Text>
      </View>

      <Text style={styles.section}>Sessions</Text>
      <StatusTimeline
        steps={enrolment.sessions.map((s, i) => ({
          key: s.id,
          label: `Session ${i + 1} · ${formatDateTime(s.at)}${s.status !== 'upcoming' ? ` · ${SESSION_LABEL[s.status]}` : ''}`,
          at: s.status === 'upcoming' ? undefined : s.at,
        }))}
      />

      {enrolment.status === 'active' ? (
        <View style={styles.cancel}>
          <CancelOrder refId={enrolment.id} label={enrolment.refundable ? 'Cancel enrolment' : 'Drop out of this course'} onCancelled={onChanged} />
        </View>
      ) : null}
    </>
  );
}

/** One enrolment: batch details, what was paid, whether it is still refundable, and the class schedule. */
export function EnrolmentScreen() {
  const token = useAuthToken();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, loading, error, reload } = useAsyncResource(() => CoachingService.enrolment(token, id));
  useRefetchOnFocus(reload);

  return (
    <ScreenContainer title="Your course">
      <AsyncBoundary loading={loading} error={error} hasData={!!data} onRetry={reload} skeletonRows={4}>
        {data ? <EnrolmentView enrolment={data} onChanged={reload} /> : null}
      </AsyncBoundary>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  head: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  title: { ...Typography.title, color: Brand.text },
  meta: { ...Typography.caption, color: Brand.textMuted },
  card: { gap: Spacing.one, padding: Spacing.three, borderRadius: Radius.lg, backgroundColor: Brand.surface, marginTop: Spacing.three },
  cardLabel: { ...Typography.overline, color: Brand.textMuted },
  fee: { ...Typography.title, color: Brand.text },
  refundable: { ...Typography.caption, color: Brand.success },
  section: { ...Typography.overline, color: Brand.textMuted, marginTop: Spacing.four, marginBottom: Spacing.two },
  cancel: { marginTop: Spacing.four },
});

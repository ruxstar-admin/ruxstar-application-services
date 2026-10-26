import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AsyncBoundary } from '@/components/ui/AsyncBoundary';
import { Badge } from '@/components/ui/Badge';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { COACHING_REFUND_POLICY } from '@/features/coaching/lib/policy';
import { PaymentSheet } from '@/features/payments/components/PaymentSheet';
import { usePaidAction } from '@/features/payments/hooks/use-paid-action';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { useAuthToken } from '@/hooks/use-auth-token';
import { formatDateTime } from '@/lib/dates';
import { formatRupees } from '@/lib/money';
import { CoachingService } from '@/services/coaching-service';
import type { Batch, CourseDetail } from '@/types/coaching';

function BatchCard({ batch, enrolled, selected, onSelect }: { batch: Batch; enrolled: boolean; selected: boolean; onSelect: () => void }) {
  const seatsLeft = batch.capacity - batch.enrolled;
  const closed = batch.status === 'full' || batch.status === 'started' || batch.status === 'cancelled';
  return (
    <View style={[styles.batch, selected && styles.batchSelected]}>
      <View style={styles.batchTop}>
        <Text style={styles.batchTitle}>{batch.label}</Text>
        {enrolled ? <Badge label="Enrolled" tone="success" /> : closed ? <Badge label={batch.status === 'full' ? 'Full' : 'Closed'} tone="error" /> : <Badge label={`${seatsLeft} seats left`} tone="neutral" />}
      </View>
      <Text style={styles.meta}>{`Starts ${formatDateTime(batch.startsAt)}`}</Text>
      <Text style={styles.meta}>{`${batch.sessions} sessions · ${batch.schedule}`}</Text>
      <Text style={styles.fee}>{formatRupees(batch.fee)}</Text>
      {!closed && !enrolled ? <PrimaryButton label={selected ? 'Selected' : 'Choose this batch'} variant={selected ? 'primary' : 'outline'} onPress={onSelect} /> : null}
    </View>
  );
}

function CourseView({ detail }: { detail: CourseDetail }) {
  const router = useRouter();
  const token = useAuthToken();
  const [batchId, setBatchId] = useState<string | null>(null);
  const batch = detail.batches.find((b) => b.id === batchId);

  const enrol = usePaidAction((paymentRef) => CoachingService.enrol(token, batchId ?? '', paymentRef ?? ''));

  return (
    <ScreenContainer
      title={detail.course.title}
      footer={batch ? <PrimaryButton label={`Pay ${formatRupees(batch.fee)} & enrol`} onPress={enrol.openSheet} /> : undefined}
    >
      <Text style={styles.coach}>{`${detail.course.coach} · ${detail.course.category} · ★ ${detail.course.rating || 'New'}`}</Text>
      <Text style={styles.description}>{detail.course.description}</Text>

      <Text style={styles.section}>Batches</Text>
      {detail.batches.map((b) => (
        <BatchCard key={b.id} batch={b} enrolled={detail.enrolledBatchIds.includes(b.id)} selected={b.id === batchId} onSelect={() => setBatchId(b.id)} />
      ))}

      {enrol.failed ? (
        <ErrorBanner message="Your payment went through, but we could not confirm the enrolment. Tap retry — you will not be charged again." onRetry={enrol.retry} />
      ) : null}

      <PaymentSheet
        visible={enrol.paying}
        onClose={enrol.closeSheet}
        title="Confirm enrolment"
        lines={batch ? [{ label: `${detail.course.title} · ${batch.label}`, amount: batch.fee }] : []}
        purpose="coaching-batch"
        module="coaching"
        notice={COACHING_REFUND_POLICY}
        onPaid={enrol.onPaid}
        onDone={() => {
          enrol.closeSheet();
          if (enrol.result) router.replace({ pathname: '/(customer)/coaching/enrolment/[id]', params: { id: enrol.result.id } });
        }}
        finishing={enrol.busy}
      />
    </ScreenContainer>
  );
}

export function CourseDetailScreen() {
  const token = useAuthToken();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, loading, error, reload } = useAsyncResource(() => CoachingService.course(token, id));

  return data ? (
    <CourseView detail={data} />
  ) : (
    <ScreenContainer title="Course">
      <AsyncBoundary loading={loading} error={error} hasData={false} onRetry={reload} skeletonRows={4}>
        {null}
      </AsyncBoundary>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  coach: { ...Typography.caption, color: Brand.textMuted },
  description: { ...Typography.body, color: Brand.text, marginTop: Spacing.two },
  section: { ...Typography.overline, color: Brand.textMuted, marginTop: Spacing.four },
  batch: { gap: Spacing.one, padding: Spacing.three, borderRadius: Radius.lg, backgroundColor: Brand.surface, borderWidth: 1, borderColor: 'transparent', marginBottom: Spacing.two },
  batchSelected: { borderColor: Brand.primary },
  batchTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  batchTitle: { ...Typography.bodyStrong, color: Brand.text },
  meta: { ...Typography.caption, color: Brand.textMuted },
  fee: { ...Typography.title, color: Brand.text, marginVertical: Spacing.one },
});

import { useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { AsyncBoundary } from '@/components/ui/AsyncBoundary';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Brand, Spacing, Typography } from '@/constants/theme';
import { JobCard } from '@/features/delivery/components/JobCard';
import { usePartnerHome } from '@/features/delivery/hooks/use-partner-home';
import { useAuthToken } from '@/hooks/use-auth-token';
import { ApiError } from '@/lib/api-error';
import { Feedback } from '@/lib/haptics';
import { DeliveryService } from '@/services/delivery-service';

const failureText = (err: unknown) => {
  if (!(err instanceof ApiError) || err.kind !== 'conflict') return 'Something went wrong. Please try again.';
  return err.message.includes('online') ? 'Go online from Home to accept jobs.' : err.message.includes('progress') ? 'Finish your current delivery first.' : 'That job is no longer available.';
};

/** Delivery offers, one tap to accept or pass. Only one delivery can be active at a time. */
export function PartnerJobsScreen() {
  const router = useRouter();
  const token = useAuthToken();
  const { data, loading, error, reload } = usePartnerHome();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [failed, setFailed] = useState<string | null>(null);

  const answer = async (id: string, accept: boolean) => {
    setBusyId(id);
    setFailed(null);
    try {
      if (accept) {
        await DeliveryService.accept(token, id);
        Feedback.success();
        router.push({ pathname: '/(partner)/job/[id]', params: { id } });
      } else {
        await DeliveryService.pass(token, id);
        Feedback.tap();
      }
      reload();
    } catch (err) {
      Feedback.error();
      setFailed(failureText(err));
      reload();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Text style={styles.title}>Jobs</Text>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {failed ? <ErrorBanner message={failed} /> : null}
        <AsyncBoundary loading={loading} error={error} hasData={!!data} onRetry={reload}>
          {data?.waiting.map((job) => (
            <JobCard key={job.id} job={job}>
              <PrimaryButton label="Accept" onPress={() => answer(job.id, true)} loading={busyId === job.id} />
              <PrimaryButton label="Pass" variant="outline" onPress={() => answer(job.id, false)} disabled={busyId === job.id} />
            </JobCard>
          ))}
          {data && data.waiting.length === 0 ? (
            <EmptyState icon="bicycle-outline" title={data.stats.online ? 'No jobs right now' : 'You are offline'} message={data.stats.online ? 'New offers appear here as soon as an order is ready.' : 'Go online from Home to receive offers.'} />
          ) : null}
        </AsyncBoundary>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Brand.bg },
  title: { ...Typography.title, color: Brand.text, padding: Spacing.three },
  content: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.five },
});

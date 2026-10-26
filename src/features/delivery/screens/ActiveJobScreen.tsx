import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AsyncBoundary } from '@/components/ui/AsyncBoundary';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { InputField } from '@/components/ui/InputField';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { StatusTimeline } from '@/components/ui/StatusTimeline';
import { Brand, Spacing, Typography } from '@/constants/theme';
import { JobCard } from '@/features/delivery/components/JobCard';
import { usePartnerHome } from '@/features/delivery/hooks/use-partner-home';
import { digitsOnly } from '@/features/kyc/lib/validators';
import { useAuthToken } from '@/hooks/use-auth-token';
import { ApiError } from '@/lib/api-error';
import { Feedback } from '@/lib/haptics';
import { DeliveryService } from '@/services/delivery-service';
import type { DeliveryJob } from '@/types/delivery';

const CODE_LENGTH = 4;

function Job({ job, onChanged }: { job: DeliveryJob; onChanged: () => void }) {
  const router = useRouter();
  const token = useAuthToken();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pickedUp = job.status === 'picked_up';

  const advance = async () => {
    setBusy(true);
    setError(null);
    try {
      await DeliveryService.advance(token, job.id, pickedUp ? code : undefined);
      Feedback.success();
      if (pickedUp) router.back();
      else onChanged();
    } catch (err) {
      Feedback.error();
      setError(err instanceof ApiError && err.kind === 'unauthorized' ? 'That code is not right. Ask the customer to check it.' : 'Something went wrong. Please try again.');
      setCode('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScreenContainer
      title="Delivery"
      footer={<PrimaryButton label={pickedUp ? 'Complete delivery' : 'I have picked it up'} onPress={advance} loading={busy} disabled={pickedUp && code.length < CODE_LENGTH} />}
    >
      <JobCard job={job} />
      <Text style={styles.section}>Progress</Text>
      <StatusTimeline
        steps={[
          { key: 'a', label: `Go to ${job.shopName}`, at: job.status !== 'offered' ? job.createdAt : undefined },
          { key: 'p', label: 'Pick up the parcel', at: pickedUp ? new Date().toISOString() : undefined },
          { key: 'd', label: `Deliver to ${job.dropArea}` },
        ]}
      />
      {pickedUp ? (
        <>
          <Text style={styles.hint}>Ask the customer for the 4-digit code shown in their order.</Text>
          <InputField label="Delivery code" value={code} onChangeText={(v) => { setCode(digitsOnly(v, CODE_LENGTH)); setError(null); }} keyboardType="number-pad" placeholder="4 digits" maxLength={CODE_LENGTH} />
        </>
      ) : null}
      {error ? <ErrorBanner message={error} /> : null}
    </ScreenContainer>
  );
}

/** The delivery in progress: pick up, then complete with the customer's code. */
export function ActiveJobScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, loading, error, reload } = usePartnerHome();
  const job = data?.active?.id === id ? data.active : undefined;

  return job ? (
    <Job job={job} onChanged={reload} />
  ) : (
    <ScreenContainer title="Delivery">
      <AsyncBoundary loading={loading} error={error} hasData={false} onRetry={reload} skeletonRows={3}>
        <Text style={styles.hint}>This delivery is finished or no longer yours.</Text>
      </AsyncBoundary>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  section: { ...Typography.overline, color: Brand.textMuted, marginTop: Spacing.four, marginBottom: Spacing.two },
  hint: { ...Typography.body, color: Brand.textMuted, marginVertical: Spacing.three },
});

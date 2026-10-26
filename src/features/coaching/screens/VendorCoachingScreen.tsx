import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { AsyncBoundary } from '@/components/ui/AsyncBoundary';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { ListRow } from '@/components/ui/ListRow';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { useAuthToken } from '@/hooks/use-auth-token';
import { useRefetchOnFocus } from '@/hooks/use-refetch-on-focus';
import { formatDateTime } from '@/lib/dates';
import { CoachingService } from '@/services/coaching-service';

export function VendorCoachingScreen() {
  const router = useRouter();
  const token = useAuthToken();
  const { data, loading, error, reload } = useAsyncResource(() => CoachingService.vendorBatches(token));
  useRefetchOnFocus(reload);

  return (
    <ScreenContainer title="Coaching" footer={<PrimaryButton label="Create course" onPress={() => router.push('/(vendor)/coaching/create')} />}>
      <AsyncBoundary loading={loading} error={error} hasData={!!data} onRetry={reload}>
        {data?.map(({ batch, courseTitle }) => (
          <View key={batch.id}>
            <ListRow
              icon="school-outline"
              title={courseTitle}
              subtitle={`${batch.label} · starts ${formatDateTime(batch.startsAt)}`}
              right={<Badge label={`${batch.enrolled}/${batch.capacity}`} tone={batch.enrolled >= batch.capacity ? 'error' : 'success'} />}
              onPress={() => router.push({ pathname: '/(vendor)/coaching/[id]', params: { id: batch.id } })}
            />
          </View>
        ))}
        {data?.length === 0 ? <EmptyState icon="school-outline" title="No courses yet" message="Create a course and its first batch to start enrolling students." /> : null}
      </AsyncBoundary>
    </ScreenContainer>
  );
}

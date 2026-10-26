import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { AsyncBoundary } from '@/components/ui/AsyncBoundary';
import { EmptyState } from '@/components/ui/EmptyState';
import { ListRow } from '@/components/ui/ListRow';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { useAuthToken } from '@/hooks/use-auth-token';
import { useRefetchOnFocus } from '@/hooks/use-refetch-on-focus';
import { StaysService } from '@/services/stays-service';

export function VendorStaysScreen() {
  const router = useRouter();
  const token = useAuthToken();
  const { data, loading, error, reload } = useAsyncResource(() => StaysService.vendorProperties(token));
  useRefetchOnFocus(reload);

  return (
    <ScreenContainer title="Stays" footer={<PrimaryButton label="Add property" onPress={() => router.push('/(vendor)/stays/create')} />}>
      <AsyncBoundary loading={loading} error={error} hasData={!!data} onRetry={reload}>
        {data?.map((property) => (
          <View key={property.id}>
            <ListRow
              icon="bed-outline"
              title={property.name}
              subtitle={`${property.area} · ${property.facilities.length} facilities`}
              onPress={() => router.push({ pathname: '/(vendor)/stays/[id]', params: { id: property.id } })}
            />
          </View>
        ))}
        {data?.length === 0 ? <EmptyState icon="bed-outline" title="No properties yet" message="Add a PG or hostel with its rooms and beds to start taking bookings." /> : null}
      </AsyncBoundary>
    </ScreenContainer>
  );
}

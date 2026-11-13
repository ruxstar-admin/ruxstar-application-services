import { useLocalSearchParams } from 'expo-router';
import { AsyncBoundary } from '@/components/ui/AsyncBoundary';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { ShopOrderDetails } from '@/features/vendor/screens/ShopOrderScreen';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { useAuthToken } from '@/hooks/use-auth-token';
import { TeamOrderService } from '@/services/order-service';

/** One order at a shop you work at; new-order notifications link here. */
export function WorkOrderScreen() {
  const token = useAuthToken();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, loading, error, reload, setData } = useAsyncResource(() => TeamOrderService.get(token, id), id);

  return (
    <ScreenContainer title="Order">
      <AsyncBoundary loading={loading} error={error} hasData={!!data} onRetry={reload} skeletonRows={4}>
        {data ? <ShopOrderDetails order={data} desk={TeamOrderService} onChanged={setData} /> : null}
      </AsyncBoundary>
    </ScreenContainer>
  );
}

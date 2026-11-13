import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { EmptyState } from '@/components/ui/EmptyState';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { SegmentedTabs } from '@/components/ui/SegmentedTabs';
import { Skeleton } from '@/components/ui/Skeleton';
import { Spacing } from '@/constants/theme';
import { OrderRow } from '@/features/pod/components/OrderRow';
import { SHOP_STATUS_LABEL } from '@/features/pod/lib/order';
import { titleCase } from '@/features/vendor/lib/pod';
import { useAuthToken } from '@/hooks/use-auth-token';
import { usePaginated } from '@/hooks/use-paginated';
import { useRefetchOnFocus } from '@/hooks/use-refetch-on-focus';
import { ApiError } from '@/lib/api-error';
import { TeamOrderService } from '@/services/order-service';
import type { ShopOrderView } from '@/types/order';

const VIEWS = [
  { key: 'new', label: 'New' },
  { key: 'active', label: 'In progress' },
  { key: 'past', label: 'Past' },
] as const;

const EMPTY: Record<ShopOrderView, { title: string; message: string }> = {
  new: { title: 'No new orders', message: 'Paid orders to this shop wait here to be accepted.' },
  active: { title: 'Nothing in progress', message: 'Accepted orders stay here until they are delivered.' },
  past: { title: 'No past orders', message: 'Delivered, turned down and cancelled orders show here.' },
};

/** A shop's paid orders for someone on its team; `id` is their place there. */
export function WorkOrdersScreen() {
  const router = useRouter();
  const token = useAuthToken();
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const [view, setView] = useState<ShopOrderView>('new');
  const list = usePaginated((cursor) => TeamOrderService.list(token, id, { view }, cursor));
  useRefetchOnFocus(list.refresh);

  const first = useRef(true);
  const { retry } = list;
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    retry();
  }, [view, retry]);

  const refused = list.error instanceof ApiError && list.error.status > 0 && list.error.kind !== 'server' ? list.error.message : null;
  return (
    <ScreenContainer title={name ? `${name} orders` : 'Orders'}>
      <SegmentedTabs options={VIEWS} value={view} onChange={setView} />
      {list.loading ? (
        <View style={styles.skeletons}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} height={72} radius={18} />
          ))}
        </View>
      ) : list.error && !list.items.length ? (
        <EmptyState
          icon={refused ? 'lock-closed-outline' : 'cloud-offline-outline'}
          title={refused ? 'You can’t see these orders' : 'Could not load orders'}
          message={refused ?? undefined}
          actionLabel="Try again"
          onAction={list.retry}
        />
      ) : !list.items.length ? (
        <EmptyState icon="receipt-outline" title={EMPTY[view].title} message={EMPTY[view].message} />
      ) : (
        <View>
          {list.items.map((order) => (
            <OrderRow
              key={order.id}
              order={order}
              subtitle={titleCase(order.address.city)}
              amount={order.price.payout}
              statusLabel={SHOP_STATUS_LABEL}
              onPress={() => router.push({ pathname: '/(customer)/work/order/[id]', params: { id: order.id } })}
            />
          ))}
          {list.hasMore ? <PrimaryButton label="Show more" variant="outline" onPress={list.loadMore} loading={list.loadingMore} /> : null}
        </View>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  skeletons: { gap: Spacing.three },
});

import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { EmptyState } from '@/components/ui/EmptyState';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { SegmentedTabs } from '@/components/ui/SegmentedTabs';
import { Skeleton } from '@/components/ui/Skeleton';
import { Spacing } from '@/constants/theme';
import { OrderRow } from '@/features/pod/components/OrderRow';
import { SHOP_STATUS_LABEL } from '@/features/pod/lib/order';
import { VendorTabScreen } from '@/features/vendor/components/VendorTabScreen';
import { useAuthToken } from '@/hooks/use-auth-token';
import { usePaginated } from '@/hooks/use-paginated';
import { useRefetchOnFocus } from '@/hooks/use-refetch-on-focus';
import { titleCase } from '@/features/vendor/lib/pod';
import { ShopOrderService } from '@/services/order-service';
import type { ShopOrderView } from '@/types/order';

const VIEWS = [
  { key: 'new', label: 'New' },
  { key: 'active', label: 'In progress' },
  { key: 'past', label: 'Past' },
] as const;

const EMPTY: Record<ShopOrderView, { title: string; message: string }> = {
  new: { title: 'No new orders', message: 'Paid orders to your shops wait here for you to accept.' },
  active: { title: 'Nothing in progress', message: 'Orders you accepted stay here until they are delivered.' },
  past: { title: 'No past orders', message: 'Delivered, turned down and cancelled orders show here.' },
};

/** Paid orders to every shop the vendor runs: new ones to accept, ones being made, and past ones. */
export function VendorOrdersScreen() {
  const router = useRouter();
  const token = useAuthToken();
  const [view, setView] = useState<ShopOrderView>('new');
  const list = usePaginated((cursor) => ShopOrderService.list(token, { view }, cursor));
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

  return (
    <VendorTabScreen title="Orders" onRefresh={list.refresh}>
      <SegmentedTabs options={VIEWS} value={view} onChange={setView} />
      {list.loading ? (
        <View style={styles.skeletons}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} height={72} radius={18} />
          ))}
        </View>
      ) : list.error && !list.items.length ? (
        <EmptyState icon="cloud-offline-outline" title="Could not load orders" actionLabel="Try again" onAction={list.retry} />
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
              onPress={() => router.push({ pathname: '/(vendor)/sale/[id]', params: { id: order.id } })}
            />
          ))}
          {list.hasMore ? <PrimaryButton label="Show more" variant="outline" onPress={list.loadMore} loading={list.loadingMore} /> : null}
        </View>
      )}
    </VendorTabScreen>
  );
}

const styles = StyleSheet.create({
  skeletons: { gap: Spacing.three },
});

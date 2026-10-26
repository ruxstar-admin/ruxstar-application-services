import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { AsyncBoundary } from '@/components/ui/AsyncBoundary';
import { Badge } from '@/components/ui/Badge';
import { PriceSummary } from '@/components/ui/PriceSummary';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { StatusTimeline, type TimelineStep } from '@/components/ui/StatusTimeline';
import { Brand, Fonts, Radius, Spacing, Typography } from '@/constants/theme';
import { CancelOrder } from '@/features/money/components/CancelOrder';
import { STATUS_LABEL } from '@/features/pod/lib/pricing';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { useAuthToken } from '@/hooks/use-auth-token';
import { PodService } from '@/services/pod-service';
import type { PodOrder, PodStatus } from '@/types/pod';

const POLL_MS = 8000;

const PATH: Record<PodOrder['fulfilment'], PodStatus[]> = {
  pickup: ['placed', 'accepted', 'printing', 'ready', 'completed'],
  delivery: ['placed', 'accepted', 'printing', 'ready', 'out_for_delivery', 'completed'],
};

const stepsFor = (order: PodOrder): TimelineStep[] =>
  PATH[order.fulfilment].map((status) => ({
    key: status,
    label: status === 'ready' && order.fulfilment === 'pickup' ? 'Ready for pickup' : STATUS_LABEL[status],
    at: order.timeline.find((t) => t.status === status)?.at,
  }));

function OrderDetails({ order, onChanged }: { order: PodOrder; onChanged: () => void }) {
  const { specs } = order;
  return (
    <>
      <View style={styles.head}>
        <View style={styles.flex}>
          <Text style={styles.id}>{order.id}</Text>
          <Text style={styles.meta}>{order.shopName}</Text>
        </View>
        <Badge label={STATUS_LABEL[order.status]} tone={order.status === 'completed' ? 'success' : order.status === 'cancelled' ? 'error' : 'accent'} />
      </View>

      {order.deliveryCode && order.status === 'out_for_delivery' ? (
        <View style={styles.code}>
          <Text style={styles.meta}>Give this code to the rider when they arrive</Text>
          <Text style={styles.codeText} accessibilityLabel={`Delivery code ${order.deliveryCode.split('').join(' ')}`}>
            {order.deliveryCode}
          </Text>
        </View>
      ) : null}

      <Text style={styles.section}>Progress</Text>
      <StatusTimeline steps={stepsFor(order)} />

      <Text style={styles.section}>Your print</Text>
      <View style={styles.card}>
        <Text style={styles.file} numberOfLines={1}>
          {order.fileName}
        </Text>
        <Text style={styles.meta}>
          {`${specs.pages} pages × ${specs.copies} · ${specs.paper} · ${specs.color ? 'Colour' : 'Black & white'} · ${specs.doubleSided ? 'Double-sided' : 'Single-sided'}`}
        </Text>
        <Text style={styles.meta}>{order.fulfilment === 'delivery' ? `Delivering to ${order.address}` : 'Pickup from the shop'}</Text>
      </View>

      <Text style={styles.section}>Payment</Text>
      <View style={styles.card}>
        <PriceSummary lines={order.lines} />
      </View>

      {order.status !== 'completed' && order.status !== 'cancelled' ? (
        <View style={styles.cancel}>
          <CancelOrder refId={order.id} label="Cancel order" onCancelled={onChanged} />
        </View>
      ) : null}
    </>
  );
}

/** Customer's view of one print order; refreshes itself while the order is still moving. */
export function PodTrackingScreen() {
  const token = useAuthToken();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, loading, error, reload } = useAsyncResource(() => PodService.order(token, id));
  const finished = data?.status === 'completed' || data?.status === 'cancelled';

  useEffect(() => {
    if (finished) return;
    const timer = setInterval(reload, POLL_MS);
    return () => clearInterval(timer);
  }, [finished, reload]);

  return (
    <ScreenContainer title="Print order">
      <AsyncBoundary loading={loading} error={error} hasData={!!data} onRetry={reload} skeletonRows={4}>
        {data ? <OrderDetails order={data} onChanged={reload} /> : null}
      </AsyncBoundary>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  head: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  id: { ...Typography.title, color: Brand.text },
  meta: { ...Typography.caption, color: Brand.textMuted },
  section: { ...Typography.overline, color: Brand.textMuted, marginTop: Spacing.four, marginBottom: Spacing.one },
  card: { gap: Spacing.one, padding: Spacing.three, borderRadius: Radius.lg, backgroundColor: Brand.surface },
  file: { ...Typography.bodyStrong, color: Brand.text },
  cancel: { marginTop: Spacing.four },
  code: { alignItems: 'center', gap: Spacing.one, padding: Spacing.three, borderRadius: Radius.lg, backgroundColor: 'rgba(180,92,242,0.14)', marginTop: Spacing.three },
  codeText: { fontFamily: Fonts.bold, fontSize: 36, letterSpacing: 8, color: Brand.text },
});

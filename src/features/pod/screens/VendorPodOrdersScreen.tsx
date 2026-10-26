import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AsyncBoundary } from '@/components/ui/AsyncBoundary';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { nextStatus, STATUS_LABEL } from '@/features/pod/lib/pricing';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { useAuthToken } from '@/hooks/use-auth-token';
import { useRefetchOnFocus } from '@/hooks/use-refetch-on-focus';
import { Feedback } from '@/lib/haptics';
import { formatRupees } from '@/lib/money';
import { timeAgo } from '@/lib/time';
import { PodService } from '@/services/pod-service';
import type { PodOrder } from '@/types/pod';

/** Vendor's open print orders, oldest first, each with a one-tap "move to next step" action. */
export function VendorPodOrdersScreen() {
  const token = useAuthToken();
  const { data, loading, error, reload } = useAsyncResource(() => PodService.vendorOrders(token));
  const [busyId, setBusyId] = useState<string | null>(null);
  useRefetchOnFocus(reload);

  const advance = async (order: PodOrder) => {
    setBusyId(order.id);
    try {
      await PodService.advance(token, order.id);
      Feedback.success();
      reload();
    } catch {
      Feedback.error();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <ScreenContainer title="Print orders">
      <AsyncBoundary loading={loading} error={error} hasData={!!data} onRetry={reload}>
        {data?.map((order) => {
          const next = nextStatus(order.status, order.fulfilment);
          return (
            <View key={order.id} style={styles.card}>
              <View style={styles.top}>
                <Text style={styles.id}>{order.id}</Text>
                <Badge label={STATUS_LABEL[order.status]} tone="accent" />
              </View>
              <Text style={styles.meta} numberOfLines={1}>
                {order.fileName}
              </Text>
              <Text style={styles.meta}>
                {`${order.specs.pages * order.specs.copies} pages · ${order.specs.color ? 'Colour' : 'B&W'} · ${order.fulfilment === 'delivery' ? 'Delivery' : 'Pickup'} · ${formatRupees(order.total)} · ${timeAgo(order.createdAt)}`}
              </Text>
              {next ? (
                <PrimaryButton label={`Mark as ${STATUS_LABEL[next].toLowerCase()}`} onPress={() => advance(order)} loading={busyId === order.id} />
              ) : null}
            </View>
          );
        })}
        {data?.length === 0 ? <EmptyState icon="print-outline" title="No open orders" message="New print orders appear here as soon as they are paid." /> : null}
      </AsyncBoundary>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  card: { gap: Spacing.two, padding: Spacing.three, borderRadius: Radius.lg, backgroundColor: Brand.surface, marginBottom: Spacing.two },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  id: { ...Typography.bodyStrong, color: Brand.text },
  meta: { ...Typography.caption, color: Brand.textMuted },
});

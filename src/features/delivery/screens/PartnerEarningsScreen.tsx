import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AsyncBoundary } from '@/components/ui/AsyncBoundary';
import { EmptyState } from '@/components/ui/EmptyState';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { useAuthToken } from '@/hooks/use-auth-token';
import { useRefetchOnFocus } from '@/hooks/use-refetch-on-focus';
import { formatDay } from '@/lib/dates';
import { formatRupees } from '@/lib/money';
import { DeliveryService } from '@/services/delivery-service';

export function PartnerEarningsScreen() {
  const token = useAuthToken();
  const { data, loading, error, reload } = useAsyncResource(() => DeliveryService.earnings(token));
  useRefetchOnFocus(reload);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Text style={styles.title}>Earnings</Text>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <AsyncBoundary loading={loading} error={error} hasData={!!data} onRetry={reload}>
          {data ? (
            <>
              <View style={styles.card}>
                <Text style={styles.label}>Today</Text>
                <Text style={styles.big}>{formatRupees(data.today)}</Text>
                <View style={styles.row}>
                  <View>
                    <Text style={styles.value}>{formatRupees(data.week)}</Text>
                    <Text style={styles.label}>Last 7 days</Text>
                  </View>
                  <View>
                    <Text style={styles.value}>{formatRupees(data.total)}</Text>
                    <Text style={styles.label}>All time</Text>
                  </View>
                </View>
                <Text style={styles.note}>You are paid from the delivery fee of each order.</Text>
              </View>

              <Text style={styles.section}>Deliveries</Text>
              {data.items.map((job) => (
                <View key={job.id} style={styles.line}>
                  <View style={styles.flex}>
                    <Text style={styles.value}>{job.shopName}</Text>
                    <Text style={styles.label}>{`${job.pickupArea} → ${job.dropArea} · ${formatDay(job.deliveredAt ?? job.createdAt)}`}</Text>
                  </View>
                  <Text style={styles.value}>{formatRupees(job.fee)}</Text>
                </View>
              ))}
              {data.items.length === 0 ? <EmptyState icon="wallet-outline" title="No deliveries yet" /> : null}
            </>
          ) : null}
        </AsyncBoundary>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  container: { flex: 1, backgroundColor: Brand.bg },
  title: { ...Typography.title, color: Brand.text, padding: Spacing.three },
  content: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.five },
  card: { gap: Spacing.two, padding: Spacing.three, borderRadius: Radius.xl, backgroundColor: Brand.surface },
  label: { ...Typography.caption, color: Brand.textMuted },
  big: { ...Typography.display, color: Brand.text },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  value: { ...Typography.bodyStrong, color: Brand.text },
  note: { ...Typography.caption, color: Brand.textFaint },
  section: { ...Typography.overline, color: Brand.textMuted, marginTop: Spacing.four },
  line: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingVertical: Spacing.three, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Brand.border },
});

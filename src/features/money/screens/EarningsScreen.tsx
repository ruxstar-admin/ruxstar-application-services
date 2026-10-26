import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { MODULES } from '@/features/vendor/lib/capabilities';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { useAuthToken } from '@/hooks/use-auth-token';
import { usePaginated } from '@/hooks/use-paginated';
import { useRefetchOnFocus } from '@/hooks/use-refetch-on-focus';
import { formatDay } from '@/lib/dates';
import { formatRupees } from '@/lib/money';
import { MoneyService } from '@/services/money-service';
import type { EarningsSummary, LedgerEntry, LedgerStatus } from '@/types/money';

const STATUS: Record<LedgerStatus, { label: string; tone: 'warning' | 'success' | 'error' }> = {
  pending: { label: 'Pending', tone: 'warning' },
  available: { label: 'Available', tone: 'success' },
  refunded: { label: 'Refunded', tone: 'error' },
};

function Summary({ summary, onWithdraw }: { summary: EarningsSummary; onWithdraw: () => void }) {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>Withdrawable</Text>
      <Text style={styles.big}>{formatRupees(summary.withdrawable)}</Text>
      <View style={styles.row}>
        <View>
          <Text style={styles.small}>{formatRupees(summary.pending)}</Text>
          <Text style={styles.label}>Pending</Text>
        </View>
        <View>
          <Text style={styles.small}>{formatRupees(summary.withdrawn)}</Text>
          <Text style={styles.label}>Withdrawn</Text>
        </View>
        <View>
          <Text style={styles.small}>{formatRupees(summary.total)}</Text>
          <Text style={styles.label}>Lifetime</Text>
        </View>
      </View>
      <Text style={styles.note}>{`Pending money is held until the order completes or 7 days pass. The weekly payout run is on ${formatDay(summary.nextSettlement)}.`}</Text>
      <PrimaryButton label="Withdraw" onPress={onWithdraw} disabled={summary.withdrawable <= 0} />
    </View>
  );
}

function Line({ entry }: { entry: LedgerEntry }) {
  const status = STATUS[entry.status];
  return (
    <View style={styles.entry}>
      <View style={styles.entryTop}>
        <Text style={styles.entryTitle} numberOfLines={1}>
          {entry.title}
        </Text>
        <Text style={styles.entryNet}>{entry.status === 'refunded' ? '—' : formatRupees(entry.vendorNet)}</Text>
      </View>
      <Text style={styles.small2}>
        {`${MODULES[entry.module].label} · ${formatDay(entry.createdAt)} · item ${formatRupees(entry.gross)} − commission ${formatRupees(entry.commission)}${entry.fundedBy === 'vendor' ? ` − your coupon ${formatRupees(entry.discount)}` : ''}${entry.fundedBy === 'ruxstar' ? ` (Ruxstar paid ${formatRupees(entry.discount)} coupon)` : ''}`}
      </Text>
      <Badge label={status.label} tone={status.tone} />
    </View>
  );
}

/** Vendor earnings: what is withdrawable, what is pending, and every sale with its commission, page by page. */
export function EarningsScreen() {
  const router = useRouter();
  const token = useAuthToken();
  const summary = useAsyncResource(() => MoneyService.earnings(token));
  const ledger = usePaginated((cursor) => MoneyService.ledger(token, cursor));
  useRefetchOnFocus(() => {
    summary.reload();
    ledger.refresh();
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <ScreenHeader title="Earnings" onBack={() => router.back()} />
      </View>

      {ledger.loading || !summary.data ? (
        <View style={styles.skeletons}>
          <Skeleton height={190} radius={20} />
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} height={64} radius={14} />
          ))}
        </View>
      ) : (
        <FlatList
          data={ledger.items}
          keyExtractor={(e) => e.id}
          renderItem={({ item }) => <Line entry={item} />}
          contentContainerStyle={styles.list}
          onEndReached={ledger.loadMore}
          onEndReachedThreshold={0.5}
          ListHeaderComponent={
            <>
              <Summary summary={summary.data} onWithdraw={() => router.push('/(vendor)/earnings/withdraw')} />
              <Text style={styles.section}>Sales</Text>
            </>
          }
          ListEmptyComponent={<EmptyState icon="receipt-outline" title="No sales yet" message="Paid orders appear here with their commission." />}
          ListFooterComponent={ledger.loadingMore ? <ActivityIndicator color={Brand.primarySoft} style={styles.footer} /> : null}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Brand.bg },
  header: { paddingHorizontal: Spacing.three },
  skeletons: { gap: Spacing.three, paddingHorizontal: Spacing.three },
  list: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.five },
  card: { gap: Spacing.two, padding: Spacing.three, borderRadius: Radius.xl, backgroundColor: Brand.surface },
  label: { ...Typography.caption, color: Brand.textMuted },
  big: { ...Typography.display, color: Brand.text },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: Spacing.two },
  small: { ...Typography.bodyStrong, color: Brand.text },
  note: { ...Typography.caption, color: Brand.textFaint },
  section: { ...Typography.overline, color: Brand.textMuted, marginTop: Spacing.four, marginBottom: Spacing.one },
  entry: { gap: Spacing.one, paddingVertical: Spacing.three, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Brand.border },
  entryTop: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.three },
  entryTitle: { ...Typography.body, color: Brand.text, flex: 1 },
  entryNet: { ...Typography.bodyStrong, color: Brand.text },
  small2: { ...Typography.caption, color: Brand.textMuted },
  footer: { paddingVertical: Spacing.three },
});

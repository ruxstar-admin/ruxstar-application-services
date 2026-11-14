import { useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChoiceChips } from '@/components/ui/ChoiceChips';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { Brand, Spacing, Typography } from '@/constants/theme';
import { errorText } from '@/features/events/lib/messages';
import { useAuthToken } from '@/hooks/use-auth-token';
import { usePaginated } from '@/hooks/use-paginated';
import { Feedback } from '@/lib/haptics';
import { shareText } from '@/lib/share-file';
import { InvoiceService } from '@/services/invoice-service';
import type { InvoiceFilter, InvoiceKind } from '@/types/invoice';
import { InvoiceRow } from '../components/InvoiceRow';
import { csvName, financialYearToDate, KIND_FILTERS, monthPeriod, pageInPeriod, recentMonths, type Period } from '../lib/invoices';
import { INVOICE_PATH } from '../lib/routes';

type Audience = 'customer' | 'vendor';
const MONTHS_SHOWN = 12;

function Results({ audience, filter, period }: { audience: Audience; filter: InvoiceFilter; period: Period | null }) {
  const router = useRouter();
  const token = useAuthToken();
  const list = usePaginated((cursor) => {
    const fetchPage = (c?: string) => InvoiceService.list(token, audience, { ...filter, limit: period ? 50 : undefined }, c);
    return period ? pageInPeriod(fetchPage, period, cursor) : fetchPage(cursor);
  });

  if (list.loading) {
    return (
      <View style={styles.skeletons} accessibilityLabel="Loading">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} height={72} radius={18} />
        ))}
      </View>
    );
  }
  if (list.error && !list.items.length) {
    return <EmptyState icon="cloud-offline-outline" title="Could not load invoices" message={errorText(list.error)} actionLabel="Try again" onAction={list.retry} />;
  }
  const filtered = !!filter.kind || !!period;
  return (
    <FlatList
      data={list.items}
      keyExtractor={(d) => d.id}
      contentContainerStyle={styles.list}
      refreshControl={<RefreshControl refreshing={list.refreshing} onRefresh={list.refresh} tintColor={Brand.primarySoft} />}
      onEndReached={list.loadMore}
      onEndReachedThreshold={0.5}
      renderItem={({ item }) => (
        <InvoiceRow
          doc={{ ...item, total: item.totals.total }}
          detail={audience === 'customer' ? (item.issuer === 'ruxstar' ? 'Ruxstar' : item.business.name) : `#${item.order.orderNo} · ${item.buyer.name}`}
          onPress={() => router.push({ pathname: INVOICE_PATH[audience], params: { id: item.id } })}
        />
      )}
      ListEmptyComponent={
        <EmptyState
          icon="document-text-outline"
          title={filtered ? 'Nothing matches' : 'No invoices yet'}
          message={
            filtered
              ? 'Try another month or type.'
              : audience === 'customer'
                ? 'When you pay for an order, its GST invoice shows up here. Refunds add a credit note.'
                : 'Ruxstar issues a GST invoice in your business’s name for every paid order, and a credit note for every refund.'
          }
        />
      }
      ListFooterComponent={list.loadingMore ? <ActivityIndicator color={Brand.primarySoft} style={styles.footer} /> : null}
    />
  );
}

/** A business's documents for a period as a CSV file, through the share sheet. The file has every type, one row per item. */
function ExportCsv({ period, business }: { period: Period | null; business?: string }) {
  const token = useAuthToken();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openedAt] = useState(Date.now);
  const label = (period ?? financialYearToDate(openedAt)).label;

  const run = async () => {
    const range = period ?? financialYearToDate(Date.now());
    setBusy(true);
    setError(null);
    try {
      const csv = await InvoiceService.exportCsv(token, { from: range.from, to: range.to }, business);
      const shared = await shareText(csv, { name: csvName(range), mimeType: 'text/csv' });
      if (shared) Feedback.success();
      else setError("This device can't share files. Export from a phone instead.");
    } catch (err) {
      Feedback.error();
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.export}>
      <PrimaryButton label={`Export ${label} as CSV`} variant="outline" onPress={run} loading={busy} />
      <Text style={styles.hint}>For your GST return: every invoice, bill of supply and credit note in that period, one row per item, amounts in rupees.</Text>
      {error ? <ErrorBanner message={error} /> : null}
    </View>
  );
}

/**
 * GST documents: a customer's from every business (or one order's, with `orderId`), or a business owner's sales (one
 * business with `business`). Owners can narrow by month and type and export a month as CSV.
 */
export function InvoiceListScreen({ audience }: { audience: Audience }) {
  const router = useRouter();
  const { orderId, business, label } = useLocalSearchParams<{ orderId?: string; business?: string; label?: string }>();
  const [kind, setKind] = useState<InvoiceKind | 'all'>('all');
  const [month, setMonth] = useState('all');
  const [openedAt] = useState(Date.now);
  const months = [{ key: 'all', label: 'Any month' }, ...recentMonths(openedAt, MONTHS_SHOWN)];
  const period = month === 'all' ? null : monthPeriod(month);
  const filter: InvoiceFilter = {
    ...(kind === 'all' ? {} : { kind }),
    ...(audience === 'customer' && orderId ? { orderId } : {}),
    ...(audience === 'vendor' && business ? { business } : {}),
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.pad}>
        <ScreenHeader title={audience === 'customer' ? 'Invoices' : 'GST invoices'} onBack={() => router.back()} />
        {label ? <Text style={styles.subtitle}>{label}</Text> : null}
      </View>
      <View style={styles.controls}>
        <ChoiceChips options={KIND_FILTERS} value={kind} onChange={setKind} />
        {audience === 'vendor' ? <ChoiceChips options={months} value={month} onChange={setMonth} secondary /> : null}
      </View>
      <View style={styles.flex}>
        <Results key={`${kind}|${month}`} audience={audience} filter={filter} period={period} />
      </View>
      {audience === 'vendor' ? <ExportCsv period={period} business={business} /> : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Brand.bg },
  flex: { flex: 1 },
  pad: { paddingHorizontal: Spacing.three },
  subtitle: { ...Typography.caption, color: Brand.textMuted, marginTop: -Spacing.two, marginBottom: Spacing.two },
  controls: { gap: Spacing.two, paddingBottom: Spacing.two },
  skeletons: { gap: Spacing.three, paddingHorizontal: Spacing.three, paddingTop: Spacing.two },
  list: { gap: Spacing.two, paddingHorizontal: Spacing.three, paddingBottom: Spacing.four },
  footer: { paddingVertical: Spacing.three },
  export: { gap: Spacing.two, paddingHorizontal: Spacing.three, paddingTop: Spacing.two, paddingBottom: Spacing.three, borderTopWidth: 1, borderTopColor: Brand.border },
  hint: { ...Typography.caption, color: Brand.textFaint },
});

import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Badge } from '@/components/ui/Badge';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { DetailLine } from '@/components/ui/DetailLine';
import { EmptyState } from '@/components/ui/EmptyState';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { Brand, Fonts, Radius, Spacing, Typography } from '@/constants/theme';
import { BUSINESS_MODULES } from '@/features/vendor/lib/business-modules';
import { money } from '@/features/vendor/lib/pod';
import { useAuthToken } from '@/hooks/use-auth-token';
import { usePaginated } from '@/hooks/use-paginated';
import { useRefetchOnFocus } from '@/hooks/use-refetch-on-focus';
import { formatDateTime } from '@/lib/dates';
import { Feedback } from '@/lib/haptics';
import { timeAgo } from '@/lib/time';
import { PaymentService } from '@/services/payment-service';
import type { Payment, PaymentStatus } from '@/types/payment';

const STATUS: Record<PaymentStatus, { label: string; tone: 'success' | 'warning' | 'neutral' | 'accent' }> = {
  paid: { label: 'Paid', tone: 'success' },
  refund_pending: { label: 'Refund on its way', tone: 'warning' },
  part_refunded: { label: 'Part refunded', tone: 'accent' },
  refunded: { label: 'Refunded', tone: 'neutral' },
};

function PaymentRow({ payment, onPress }: { payment: Payment; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        Feedback.tap();
        onPress();
      }}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.icon}>
        <Ionicons name={BUSINESS_MODULES[payment.module].icon} size={20} color={Brand.primarySoft} />
      </View>
      <View style={styles.text}>
        <Text style={styles.title} numberOfLines={1}>
          {payment.business.name}
        </Text>
        <Text style={styles.subtitle} numberOfLines={1}>{`#${payment.order.orderNo} · ${payment.order.label} · ${timeAgo(payment.paidAt)}`}</Text>
        {payment.refunded ? <Text style={styles.back}>{`${money(payment.refunded)} back`}</Text> : null}
      </View>
      <View style={styles.right}>
        <Text style={styles.amount}>{money(payment.amount)}</Text>
        <Badge label={STATUS[payment.status].label} tone={STATUS[payment.status].tone} />
      </View>
    </Pressable>
  );
}

function PaymentDetails({ payment, onOrder }: { payment: Payment; onOrder: () => void }) {
  return (
    <View style={styles.details}>
      <View style={styles.total}>
        <Text style={styles.totalAmount}>{money(payment.amount)}</Text>
        <Badge label={STATUS[payment.status].label} tone={STATUS[payment.status].tone} />
      </View>
      <View style={styles.card}>
        <DetailLine label="Paid to" value={payment.business.name} />
        <DetailLine label="For" value={`Order #${payment.order.orderNo} · ${payment.order.label}`} />
        <DetailLine label="Paid on" value={formatDateTime(payment.paidAt)} />
        {payment.paymentId ? <DetailLine label="Payment ID" value={payment.paymentId} copyable /> : null}
      </View>
      {payment.refunds.length ? (
        <>
          <Text style={styles.section}>Refunds</Text>
          <View style={styles.card}>
            {payment.refunds.map((r, i) => (
              <View key={`${r.at}-${i}`} style={styles.refund}>
                <View style={styles.text}>
                  <Text style={styles.refundTitle}>{r.kind === 'full' ? 'Full refund' : (r.reason ?? 'Part refund')}</Text>
                  <Text style={styles.subtitle}>{`${formatDateTime(r.at)} · ${r.status === 'done' ? 'Refunded' : 'Refunding…'}`}</Text>
                </View>
                <Text style={styles.refundAmount}>{`+${money(r.amount)}`}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.note}>Refunds go back to how you paid. Banks take up to 7 days to show them.</Text>
        </>
      ) : null}
      <PrimaryButton label="View order" variant="outline" onPress={onOrder} />
    </View>
  );
}

/** What you paid, at every business, and what came back. `open` (an order ID) opens that payment straight away. */
export function MyPaymentsScreen() {
  const router = useRouter();
  const token = useAuthToken();
  const { open: openId } = useLocalSearchParams<{ open?: string }>();
  const list = usePaginated((cursor) => PaymentService.list(token, cursor));
  const [open, setOpen] = useState<Payment | null>(null);
  useRefetchOnFocus(list.refresh);

  useEffect(() => {
    if (!openId) return;
    let live = true;
    PaymentService.get(token, openId)
      .then((payment) => live && setOpen(payment))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [openId, token]);

  const toOrder = (payment: Payment) => {
    setOpen(null);
    if (payment.order.id === openId && router.canGoBack()) router.back();
    else router.push({ pathname: '/(customer)/pod/order/[id]', params: { id: payment.order.id } });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <ScreenHeader title="Your payments" onBack={() => router.back()} />
      </View>
      {list.loading ? (
        <View style={styles.skeletons}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} height={72} radius={18} />
          ))}
        </View>
      ) : list.error && list.items.length === 0 ? (
        <EmptyState icon="cloud-offline-outline" title="Could not load your payments" actionLabel="Try again" onAction={list.retry} />
      ) : (
        <FlatList
          data={list.items}
          keyExtractor={(p) => p.id}
          renderItem={({ item }) => <PaymentRow payment={item} onPress={() => setOpen(item)} />}
          refreshControl={<RefreshControl refreshing={list.refreshing} onRefresh={list.refresh} tintColor={Brand.primarySoft} />}
          contentContainerStyle={styles.list}
          onEndReached={list.loadMore}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={
            <EmptyState
              icon="wallet-outline"
              title="No payments yet"
              message="What you pay for orders shows up here, with any refunds."
              actionLabel="Find a print shop"
              onAction={() => router.push('/(customer)/(tabs)/discover')}
            />
          }
          ListFooterComponent={list.loadingMore ? <ActivityIndicator color={Brand.primarySoft} style={styles.footer} /> : null}
        />
      )}
      <BottomSheet visible={!!open} onClose={() => setOpen(null)} title="Payment">
        {open ? <PaymentDetails payment={open} onOrder={() => toOrder(open)} /> : null}
      </BottomSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Brand.bg },
  header: { paddingHorizontal: Spacing.three },
  list: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.five },
  footer: { paddingVertical: Spacing.three },
  skeletons: { gap: Spacing.three, paddingHorizontal: Spacing.three },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    marginBottom: Spacing.two,
    borderRadius: Radius.lg,
    backgroundColor: Brand.surface,
    borderWidth: 1,
    borderColor: Brand.border,
  },
  pressed: { opacity: 0.7 },
  icon: { width: 40, height: 40, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(180,92,242,0.14)' },
  text: { flex: 1, gap: 2 },
  title: { ...Typography.bodyStrong, color: Brand.text },
  subtitle: { ...Typography.caption, color: Brand.textMuted },
  back: { ...Typography.caption, fontFamily: Fonts.semibold, color: Brand.success },
  right: { alignItems: 'flex-end', gap: Spacing.one },
  amount: { ...Typography.bodyStrong, color: Brand.text },
  details: { gap: Spacing.three },
  total: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  totalAmount: { fontFamily: Fonts.bold, fontSize: 28, color: Brand.text },
  card: { padding: Spacing.three, gap: Spacing.three, borderRadius: Radius.lg, backgroundColor: Brand.bg, borderWidth: 1, borderColor: Brand.border },
  section: { ...Typography.caption, fontFamily: Fonts.semibold, color: Brand.textMuted, textTransform: 'uppercase', letterSpacing: 0.6 },
  refund: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  refundTitle: { ...Typography.body, fontSize: 15, color: Brand.text },
  refundAmount: { ...Typography.bodyStrong, color: Brand.success },
  note: { ...Typography.caption, color: Brand.textFaint },
});

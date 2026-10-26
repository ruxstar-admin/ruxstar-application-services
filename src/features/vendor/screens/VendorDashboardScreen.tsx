import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { AsyncBoundary } from '@/components/ui/AsyncBoundary';
import { Badge } from '@/components/ui/Badge';
import { ListRow } from '@/components/ui/ListRow';
import { Brand, Radius, Spacing, Typography } from '@/constants/theme';
import { MODULES } from '@/features/vendor/lib/capabilities';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { useAuthToken } from '@/hooks/use-auth-token';
import { useRefetchOnFocus } from '@/hooks/use-refetch-on-focus';
import { Feedback } from '@/lib/haptics';
import { formatRupees } from '@/lib/money';
import { timeAgo } from '@/lib/time';
import { VendorService } from '@/services/vendor-service';
import type { VendorSummary } from '@/types/vendor';

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function Dashboard({ summary, onToggleStore }: { summary: VendorSummary; onToggleStore: (open: boolean) => void }) {
  const router = useRouter();
  const { business, earnings } = summary;

  return (
    <>
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <View style={styles.flex}>
            <Text style={styles.business}>{business.name}</Text>
            <View style={styles.modules}>
              {business.modules.map((m) => (
                <Badge key={m} label={MODULES[m].label} tone="accent" />
              ))}
            </View>
          </View>
          <View style={styles.storeToggle}>
            <Text style={styles.storeLabel}>{business.open ? 'Store open' : 'Store closed'}</Text>
            <Switch
              value={business.open}
              onValueChange={onToggleStore}
              trackColor={{ false: Brand.disabled, true: Brand.success }}
              thumbColor={Brand.text}
              accessibilityLabel="Store open"
            />
          </View>
        </View>
        <View style={styles.earnings}>
          <Stat label="Total earnings" value={formatRupees(earnings.total)} />
          <Stat label="Withdrawable" value={formatRupees(earnings.withdrawable)} />
          <Stat label="Withdrawn" value={formatRupees(earnings.withdrawn)} />
        </View>
      </View>

      <View style={styles.tiles}>
        <Stat label="Open orders" value={String(summary.openOrders)} />
        <Stat label="Registrations" value={String(summary.registrations)} />
        <Stat label="Students" value={String(summary.students)} />
      </View>

      <ListRow icon="wallet-outline" title="Earnings" subtitle="Ledger, payouts and withdrawals" onPress={() => router.push('/(vendor)/earnings')} />
      <ListRow icon="pricetags-outline" title="Coupons" subtitle="Discount codes you fund" onPress={() => router.push('/(vendor)/coupons')} />
      <ListRow icon="print-outline" title="Print orders" subtitle="Move orders through printing and delivery" onPress={() => router.push('/(vendor)/orders')} />
      <ListRow icon="calendar-outline" title="Events" subtitle="Create events, registrations and check-in" onPress={() => router.push('/(vendor)/events')} />
      <ListRow icon="school-outline" title="Coaching" subtitle="Courses, batches and attendance" onPress={() => router.push('/(vendor)/coaching')} />
      <ListRow icon="bed-outline" title="Stays" subtitle="Properties, rooms, beds and facilities" onPress={() => router.push('/(vendor)/stays')} />
      <ListRow icon="people-outline" title="Team" subtitle="Staff, requests and permissions" onPress={() => router.push('/(vendor)/team')} />
      <ListRow icon="reader-outline" title="Audit log" subtitle="Everything done on this business" onPress={() => router.push('/(vendor)/audit')} />

      <Text style={styles.section}>Recent activity</Text>
      {summary.activity.map((entry) => (
        <View key={entry.id} style={styles.activity}>
          <Text style={styles.activityText}>
            <Text style={styles.actor}>{entry.actor}</Text>
            {` ${entry.action}`}
          </Text>
          <Text style={styles.activityTime}>{timeAgo(entry.at)}</Text>
        </View>
      ))}
      <Text style={styles.note}>Every staff action is written to an audit log you can see.</Text>
    </>
  );
}

/** Vendor home: store switch, earnings, key counts, team and audit entry points, recent activity. */
export function VendorDashboardScreen() {
  const router = useRouter();
  const token = useAuthToken();
  const { data, loading, error, reload, setData } = useAsyncResource(() => VendorService.summary(token));
  const [togglingBlocked, setTogglingBlocked] = useState(false);
  useRefetchOnFocus(reload);

  const toggleStore = async (open: boolean) => {
    if (!data || togglingBlocked) return;
    const previous = data;
    setTogglingBlocked(true);
    setData({ ...data, business: { ...data.business, open } });
    try {
      await VendorService.setStoreOpen(token, open);
      Feedback.select();
    } catch {
      Feedback.error();
      setData(previous);
    } finally {
      setTogglingBlocked(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <Text style={styles.overline}>Vendor · Dashboard</Text>
        <Pressable accessibilityRole="button" hitSlop={12} onPress={() => router.replace('/(customer)/(tabs)/profile')}>
          <Text style={styles.exit}>Exit</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <AsyncBoundary loading={loading} error={error} hasData={!!data} onRetry={reload} skeletonRows={4}>
          {data ? <Dashboard summary={data} onToggleStore={toggleStore} /> : null}
        </AsyncBoundary>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: Brand.bg },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.three, paddingVertical: Spacing.three },
  overline: { ...Typography.overline, color: Brand.textMuted },
  exit: { ...Typography.bodyStrong, color: Brand.primarySoft },
  content: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.five, gap: Spacing.two },
  card: { backgroundColor: Brand.surface, borderRadius: Radius.lg, padding: Spacing.three, gap: Spacing.three },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  business: { ...Typography.heading, color: Brand.text },
  modules: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.one, marginTop: Spacing.one },
  storeToggle: { alignItems: 'center', gap: Spacing.one },
  storeLabel: { ...Typography.caption, color: Brand.textMuted },
  earnings: { flexDirection: 'row', justifyContent: 'space-between' },
  tiles: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.three },
  stat: { gap: 2 },
  statValue: { ...Typography.title, color: Brand.text },
  statLabel: { ...Typography.caption, color: Brand.textMuted },
  section: { ...Typography.overline, color: Brand.textMuted, marginTop: Spacing.three },
  activity: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.three, paddingVertical: Spacing.two },
  activityText: { ...Typography.body, color: Brand.textMuted, flex: 1 },
  actor: { color: Brand.text, fontFamily: Typography.bodyStrong.fontFamily },
  activityTime: { ...Typography.caption, color: Brand.textFaint },
  note: { ...Typography.caption, color: Brand.textFaint, marginTop: Spacing.two },
});

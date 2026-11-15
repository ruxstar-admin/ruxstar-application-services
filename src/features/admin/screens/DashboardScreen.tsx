import { RefreshControl, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { Brand, Radius, Spacing } from '@/constants/theme';
import { useAuthStore } from '@/stores/auth-store';
import { allows, useAccess } from '../access';
import { ConsoleScreen, consoleStyles } from '../components/parts';
import { MetricTile, TileCard, cellWidth, tileCardInner } from '../components/tiles';
import { pageCountText, useConsoleMetrics } from '../hooks/use-console-metrics';
import { MODULE_LABEL } from '../labels';

const count = (n: number) => n.toLocaleString('en-IN');
const waiting = (n: number) => (n > 0 ? 'warn' : 'plain');

function Cells({ width, n }: { width: number; n: number }) {
  return (
    <>
      {Array.from({ length: n }, (_, i) => (
        <Skeleton key={i} width={width} height={68} radius={Radius.md} />
      ))}
    </>
  );
}

/** The console home: every count the console has, grouped by area, each one opening the screen behind it. */
export function DashboardScreen() {
  const router = useRouter();
  const access = useAccess();
  const canPayouts = allows(access, 'payouts.view');
  const name = useAuthStore((s) => s.name);
  const { width } = useWindowDimensions();
  const { overview, support, payouts, reload, refreshing } = useConsoleMetrics();
  const first = name?.split(' ')[0];
  const cell = cellWidth(tileCardInner(width), width < 340 ? 2 : 3);
  const go = (href: Href) => () => router.push(href);
  const o = overview.data;
  const desk = support.data ?? o?.support ?? null;

  return (
    <ConsoleScreen
      title={first ? `Hi ${first}` : 'Dashboard'}
      subtitle={access.admin ? 'You are an admin, so every section is open to you.' : `Signed in as ${access.title ?? 'Ruxstar staff'}.`}
    >
      <ScrollView
        contentContainerStyle={consoleStyles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={reload} tintColor={Brand.primarySoft} />}
        showsVerticalScrollIndicator={false}
      >
        {!o && overview.loading ? (
          <View style={styles.loading} accessibilityLabel="Loading">
            {[3, 3, 6].map((n, i) => (
              <Skeleton key={i} height={60 + Math.ceil(n / 3) * 80} radius={Radius.xl} />
            ))}
          </View>
        ) : null}
        {!o && !overview.loading && overview.error ? (
          <EmptyState icon="cloud-offline-outline" title="Could not load this" message="Check your connection and try again." actionLabel="Try again" onAction={reload} />
        ) : null}

        {o && (o.kyc || o.reports || o.orders) ? (
          <TileCard title="Waiting for a decision" icon="alert-circle-outline" tint="amber">
            {o.kyc ? (
              <>
                <MetricTile label="Verification to review" value={count(o.kyc.waiting)} tone={waiting(o.kyc.waiting)} width={cell} onPress={go('/(admin)/(tabs)/kyc')} />
                <MetricTile label="Of those, delivery partners" value={count(o.kyc.delivery)} width={cell} onPress={go('/(admin)/(tabs)/kyc')} />
              </>
            ) : null}
            {o.reports ? (
              <>
                <MetricTile label="Reported posts" value={count(o.reports.posts)} tone={waiting(o.reports.posts)} width={cell} onPress={go('/(admin)/(tabs)/reports')} />
                <MetricTile label="Reports on those posts" value={count(o.reports.reports)} width={cell} onPress={go('/(admin)/(tabs)/reports')} />
                <MetricTile label="Reported people" value={count(o.reports.people)} tone={waiting(o.reports.people)} width={cell} onPress={go('/(admin)/(tabs)/reports')} />
                <MetricTile label="Reported reviews" value={count(o.reports.reviews)} tone={waiting(o.reports.reviews)} width={cell} onPress={go('/(admin)/(tabs)/reports')} />
              </>
            ) : null}
            {o.orders ? (
              <MetricTile label="Print order problems" value={count(o.orders.problems)} tone={waiting(o.orders.problems)} width={cell} onPress={go('/(admin)/(tabs)/reports')} />
            ) : null}
          </TileCard>
        ) : null}

        {o && desk ? (
          <TileCard title="Help tickets" icon="help-buoy-outline" tint="blue">
            <MetricTile label="Open" value={count(desk.open)} width={cell} onPress={go('/(admin)/support')} />
            <MetricTile label="Past reply-by" value={count(desk.overdue)} tone={waiting(desk.overdue)} width={cell} onPress={go('/(admin)/support')} />
            <MetricTile label="With nobody on them" value={count(desk.unassigned)} tone={waiting(desk.unassigned)} width={cell} onPress={go('/(admin)/support')} />
            {support.data ? (
              <>
                <MetricTile label="Assigned to you" value={count(support.data.mine)} width={cell} onPress={go('/(admin)/support')} />
                <MetricTile label="Waiting on the person" value={count(support.data.waiting)} width={cell} onPress={go('/(admin)/support')} />
              </>
            ) : support.loading ? (
              <Cells width={cell} n={2} />
            ) : null}
          </TileCard>
        ) : null}

        {o && (o.users || o.staff) ? (
          <TileCard title="People" icon="people-outline" tint="purple">
            {o.users ? (
              <>
                <MetricTile label="Accounts" value={count(o.users.total)} width={cell} onPress={go('/(admin)/(tabs)/people')} />
                <MetricTile label="Joined this week" value={count(o.users.newThisWeek)} width={cell} onPress={go('/(admin)/(tabs)/people')} />
                <MetricTile label="On hold" value={count(o.users.suspended)} width={cell} onPress={go('/(admin)/(tabs)/people')} />
              </>
            ) : null}
            {o.staff ? <MetricTile label="Ruxstar staff" value={count(o.staff.active)} width={cell} onPress={go('/(admin)/staff')} /> : null}
          </TileCard>
        ) : null}

        {o?.businesses ? (
          <TileCard title="Businesses" icon="storefront-outline" tint="purple">
            <MetricTile label="All businesses" value={count(o.businesses.total)} width={cell} onPress={go('/(admin)/businesses')} />
            <MetricTile label="Live" value={count(o.businesses.live)} width={cell} onPress={go('/(admin)/businesses')} />
            <MetricTile label="On hold" value={count(o.businesses.suspended)} width={cell} onPress={go('/(admin)/businesses')} />
          </TileCard>
        ) : null}

        {o && canPayouts ? (
          <TileCard title="Money" icon="wallet-outline" tint="green">
            {payouts.data ? (
              <>
                <MetricTile label="Withdrawals on the way" value={pageCountText(payouts.data.pending)} width={cell} onPress={go('/(admin)/payouts')} />
                <MetricTile label="Failed withdrawals" value={pageCountText(payouts.data.failed)} tone={waiting(payouts.data.failed.n)} width={cell} onPress={go('/(admin)/payouts')} />
                <MetricTile label="Orders with money on hold" value={pageCountText(payouts.data.held)} width={cell} onPress={go('/(admin)/payouts')} />
              </>
            ) : payouts.loading ? (
              <Cells width={cell} n={3} />
            ) : (
              <Text style={consoleStyles.muted}>Could not load payouts. Pull down to try again.</Text>
            )}
          </TileCard>
        ) : null}

        {o?.modules ? (
          <TileCard title="Modules" icon="apps-outline" tint="amber">
            {o.modules.map((m) => (
              <MetricTile
                key={m.module}
                label={MODULE_LABEL[m.module]}
                value={m.live ? 'Live' : 'Off'}
                tone={m.live ? 'good' : 'quiet'}
                width={cell}
                onPress={go({ pathname: '/(admin)/modules/[module]', params: { module: m.module } })}
              />
            ))}
          </TileCard>
        ) : null}
      </ScrollView>
    </ConsoleScreen>
  );
}

const styles = StyleSheet.create({
  loading: { gap: Spacing.two },
});

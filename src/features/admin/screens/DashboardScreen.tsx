import { RefreshControl, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { Brand, Radius, Spacing } from '@/constants/theme';
import { money } from '@/features/vendor/lib/pod';
import { useAuthStore } from '@/stores/auth-store';
import type { PayoutTotal } from '@/types/admin';
import { useAccess } from '../access';
import { ModuleStats } from '../components/ModuleStats';
import { ConsoleScreen, consoleStyles } from '../components/parts';
import { MetricTile, TileCard, cellWidth, tileCardInner } from '../components/tiles';
import { useConsoleMetrics } from '../hooks/use-console-metrics';
import { MODULE_LABEL } from '../labels';
import { asOfText, hasQueues, shownBlocks } from '../lib/stats';

const count = (n: number) => n.toLocaleString('en-IN');
const waiting = (n: number) => (n > 0 ? 'warn' : 'plain');
const payoutLabel = (label: string, p: PayoutTotal) => `${label} (${count(p.count)})`;

function Cells({ width, n }: { width: number; n: number }) {
  return (
    <>
      {Array.from({ length: n }, (_, i) => (
        <Skeleton key={i} width={width} height={68} radius={Radius.md} />
      ))}
    </>
  );
}

/** The console home: every number from the stats route, grouped by area and module, each one opening the screen behind it. */
export function DashboardScreen() {
  const router = useRouter();
  const access = useAccess();
  const name = useAuthStore((s) => s.name);
  const { width } = useWindowDimensions();
  const { stats, overview, support, reload, refreshing } = useConsoleMetrics();
  const first = name?.split(' ')[0];
  const cell = cellWidth(tileCardInner(width), width < 340 ? 2 : 3);
  const go = (href: Href) => () => router.push(href);
  const s = stats.data;
  const q = s?.queues ?? null;
  const o = overview.data;
  const desk = support.data;
  const modules = shownBlocks(s?.modules);

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
        {!s && stats.loading ? (
          <View style={styles.loading} accessibilityLabel="Loading">
            {[3, 3, 6].map((n, i) => (
              <Skeleton key={i} height={60 + Math.ceil(n / 3) * 80} radius={Radius.xl} />
            ))}
          </View>
        ) : null}
        {!s && !stats.loading && stats.error ? (
          <EmptyState icon="cloud-offline-outline" title="Could not load this" message="Check your connection and try again." actionLabel="Try again" onAction={reload} />
        ) : null}
        {s ? <Text style={consoleStyles.muted}>{`${asOfText(s.asOf)}. Pull down to refresh.`}</Text> : null}

        {hasQueues(q) ? (
          <TileCard title="Waiting for Ruxstar" icon="alert-circle-outline" tint="amber">
            {q.kyc !== null ? <MetricTile label="Verification to review" value={count(q.kyc)} tone={waiting(q.kyc)} width={cell} onPress={go('/(admin)/(tabs)/kyc')} /> : null}
            {q.helpTickets !== null ? (
              <MetricTile label="Help tickets to answer" value={count(q.helpTickets)} tone={waiting(q.helpTickets)} width={cell} onPress={go('/(admin)/support')} />
            ) : null}
            {q.reports !== null ? <MetricTile label="Open reports" value={count(q.reports)} tone={waiting(q.reports)} width={cell} onPress={go('/(admin)/(tabs)/reports')} /> : null}
            {q.orderProblems !== null ? (
              <MetricTile label="Print order problems" value={count(q.orderProblems)} tone={waiting(q.orderProblems)} width={cell} onPress={go('/(admin)/(tabs)/reports')} />
            ) : null}
            {q.staysObjections !== null ? (
              <MetricTile label="PG objections" value={count(q.staysObjections)} tone={waiting(q.staysObjections)} width={cell} onPress={go('/(admin)/objections')} />
            ) : null}
            {q.shopReturns !== null ? (
              <MetricTile
                label="Shop returns open"
                value={count(q.shopReturns)}
                tone={waiting(q.shopReturns)}
                width={cell}
                onPress={go({ pathname: '/(admin)/store-orders', params: { returns: 'open' } })}
              />
            ) : null}
          </TileCard>
        ) : null}

        {s && desk ? (
          <TileCard title="Help tickets" icon="help-buoy-outline" tint="blue">
            <MetricTile label="Past reply-by" value={count(desk.overdue)} tone={waiting(desk.overdue)} width={cell} onPress={go('/(admin)/support')} />
            <MetricTile label="With nobody on them" value={count(desk.unassigned)} tone={waiting(desk.unassigned)} width={cell} onPress={go('/(admin)/support')} />
            <MetricTile label="Assigned to you" value={count(desk.mine)} width={cell} onPress={go('/(admin)/support')} />
            <MetricTile label="Waiting on the person" value={count(desk.waiting)} tone="quiet" width={cell} onPress={go('/(admin)/support')} />
          </TileCard>
        ) : null}

        {s?.people ? (
          <TileCard title="People" icon="people-outline" tint="purple">
            <MetricTile label="Accounts" value={count(s.people.total)} width={cell} onPress={go('/(admin)/(tabs)/people')} />
            <MetricTile label="Joined today" value={count(s.people.joinedToday)} width={cell} onPress={go('/(admin)/(tabs)/people')} />
            <MetricTile label="Joined this week" value={count(s.people.joinedThisWeek)} width={cell} onPress={go('/(admin)/(tabs)/people')} />
            <MetricTile label="Verified" value={count(s.people.verified)} tone="good" width={cell} onPress={go('/(admin)/(tabs)/people')} />
            <MetricTile label="On hold" value={count(s.people.onHold)} tone="quiet" width={cell} onPress={go('/(admin)/(tabs)/people')} />
            {o?.staff ? <MetricTile label="Ruxstar staff" value={count(o.staff.active)} width={cell} onPress={go('/(admin)/staff')} /> : null}
          </TileCard>
        ) : null}

        {s?.money ? (
          <TileCard title="Money" icon="wallet-outline" tint="green">
            <MetricTile label="Collected today" value={money(s.money.collectedToday)} tone="good" width={cell} />
            <MetricTile label="This week" value={money(s.money.collectedThisWeek)} width={cell} />
            <MetricTile label="This month" value={money(s.money.collectedThisMonth)} width={cell} />
            <MetricTile label="Refunded today" value={money(s.money.refundsToday)} width={cell} />
            <MetricTile label="Refunded this month" value={money(s.money.refundsThisMonth)} width={cell} />
            <MetricTile label="Held for vendors and partners" value={money(s.money.held)} width={cell} onPress={go('/(admin)/payouts')} />
            <MetricTile label={payoutLabel('Withdrawals on the way', s.money.payouts.pending)} value={money(s.money.payouts.pending.amount)} width={cell} onPress={go('/(admin)/payouts')} />
            <MetricTile
              label={payoutLabel('Failed withdrawals', s.money.payouts.failed)}
              value={money(s.money.payouts.failed.amount)}
              tone={waiting(s.money.payouts.failed.count)}
              width={cell}
              onPress={go('/(admin)/payouts')}
            />
            <MetricTile label={payoutLabel('Paid out this month', s.money.payouts.paidThisMonth)} value={money(s.money.payouts.paidThisMonth.amount)} width={cell} onPress={go('/(admin)/payouts')} />
          </TileCard>
        ) : null}

        {modules.map((b) => (
          <ModuleStats key={b.module} block={b} cell={cell} />
        ))}

        {s && o?.modules ? (
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
        ) : s && overview.loading ? (
          <TileCard title="Modules" icon="apps-outline" tint="amber">
            <Cells width={cell} n={3} />
          </TileCard>
        ) : null}
      </ScrollView>
    </ConsoleScreen>
  );
}

const styles = StyleSheet.create({
  loading: { gap: Spacing.two },
});

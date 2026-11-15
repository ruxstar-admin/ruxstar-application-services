import { RefreshControl, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useRouter } from 'expo-router';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { Brand, Radius, Spacing } from '@/constants/theme';
import { money } from '@/features/vendor/lib/pod';
import { useAuthStore } from '@/stores/auth-store';
import { useAccess } from '../access';
import { ConsoleScreen, consoleStyles } from '../components/parts';
import { GRID_GAP, SectionTile, cellWidth, tileCardInner } from '../components/tiles';
import { useConsoleMetrics } from '../hooks/use-console-metrics';
import { MODULE_LABEL } from '../labels';
import { AREA, BUSINESS_MODULES, liveBusinesses, moduleLine, queueTotal, ticketsNeedingYou, type DashboardSection } from '../lib/dashboard';
import { MODULE_ICON } from '../lib/modules';
import { asOfText, hasQueues, shownBlocks } from '../lib/stats';

const count = (n: number) => n.toLocaleString('en-IN');

/** The console home: one tile per area, each opening a screen with that area's numbers. */
export function DashboardScreen() {
  const router = useRouter();
  const access = useAccess();
  const name = useAuthStore((s) => s.name);
  const { width } = useWindowDimensions();
  const { stats, overview, support, reload, refreshing } = useConsoleMetrics();
  const first = name?.split(' ')[0];
  const cell = cellWidth(tileCardInner(width, true), 2);
  const open = (section: DashboardSection) => () => router.push({ pathname: '/(admin)/dashboard/[section]', params: { section } });

  const s = stats.data;
  const q = s?.queues ?? null;
  const desk = support.data;
  const blocks = shownBlocks(s?.modules);
  const businesses = blocks.filter((b) => BUSINESS_MODULES.includes(b.module));
  const delivery = blocks.find((b) => b.module === 'delivery');
  const modules = overview.data?.modules;
  const waiting = queueTotal(q);
  const needYou = desk ? ticketsNeedingYou(desk) : 0;

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
          <View style={styles.grid} accessibilityLabel="Loading">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} width={cell} height={128} radius={Radius.lg} />
            ))}
          </View>
        ) : null}
        {!s && !stats.loading && stats.error ? (
          <EmptyState icon="cloud-offline-outline" title="Could not load this" message="Check your connection and try again." actionLabel="Try again" onAction={reload} />
        ) : null}

        {s ? (
          <>
            <Text style={consoleStyles.muted}>{`${asOfText(s.asOf)}. Pull down to refresh.`}</Text>
            <View style={styles.grid}>
              {hasQueues(q) ? (
                <SectionTile
                  {...AREA.waiting}
                  line={waiting > 0 ? `${count(waiting)} waiting` : 'All clear'}
                  warn={waiting > 0}
                  width={cell}
                  onPress={open('waiting')}
                />
              ) : null}
              {desk ? (
                <SectionTile
                  {...AREA.help}
                  line={needYou > 0 ? `${count(needYou)} need you` : `${count(desk.open)} open`}
                  warn={needYou > 0}
                  width={cell}
                  onPress={open('help')}
                />
              ) : null}
              {s.people ? (
                <SectionTile {...AREA.people} line={`${count(s.people.total)} accounts`} width={cell} onPress={open('people')} />
              ) : null}
              {s.money ? (
                <SectionTile
                  {...AREA.money}
                  line={`${money(s.money.collectedToday)} today`}
                  warn={s.money.payouts.failed.count > 0}
                  width={cell}
                  onPress={open('money')}
                />
              ) : null}
              {businesses.length ? (
                <SectionTile {...AREA.businesses} line={`${count(liveBusinesses(businesses))} live`} width={cell} onPress={open('businesses')} />
              ) : null}
              {delivery ? (
                <SectionTile
                  icon={MODULE_ICON.delivery}
                  label={MODULE_LABEL.delivery}
                  line={moduleLine(delivery, count)}
                  tint="blue"
                  width={cell}
                  onPress={open('delivery')}
                />
              ) : null}
              {modules ? (
                <SectionTile
                  icon="apps-outline"
                  label="Modules"
                  line={`${modules.filter((m) => m.live).length} of ${modules.length} live`}
                  tint="amber"
                  width={cell}
                  onPress={() => router.push('/(admin)/modules')}
                />
              ) : null}
            </View>
          </>
        ) : null}
      </ScrollView>
    </ConsoleScreen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GRID_GAP, paddingTop: Spacing.one },
});

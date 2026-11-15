import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useRouter } from 'expo-router';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Skeleton } from '@/components/ui/Skeleton';
import { Radius, Spacing } from '@/constants/theme';
import { HelpArea, MoneyArea, PeopleArea, WaitingArea } from '../components/DashboardAreas';
import { ModuleStats } from '../components/ModuleStats';
import { consoleStyles } from '../components/parts';
import { GRID_GAP, SectionTile, cellWidth, tileCardInner } from '../components/tiles';
import { useConsoleMetrics } from '../hooks/use-console-metrics';
import { MODULE_LABEL } from '../labels';
import { AREA, BUSINESS_MODULES, isDashboardSection, moduleLine, type DashboardSection } from '../lib/dashboard';
import { MODULE_ICON } from '../lib/modules';
import { asOfText, hasQueues, shownBlocks } from '../lib/stats';

const count = (n: number) => n.toLocaleString('en-IN');

const titleOf = (section: DashboardSection) => (section in AREA ? AREA[section as keyof typeof AREA].label : MODULE_LABEL[section as keyof typeof MODULE_LABEL]);

/** One dashboard area opened from its tile: its numbers, or under Businesses a tile per business. */
export function DashboardSectionScreen({ section }: { section: string | undefined }) {
  if (!isDashboardSection(section)) return <NotFound />;
  return <Section section={section} />;
}

function Section({ section }: { section: DashboardSection }) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { stats, overview, support, reload } = useConsoleMetrics();
  const cell = cellWidth(tileCardInner(width), width < 340 ? 2 : 3);
  const half = cellWidth(tileCardInner(width, true), 2);
  const s = stats.data;
  const blocks = shownBlocks(s?.modules);
  const loading = stats.loading && !s;

  const body = () => {
    if (!s) return null;
    switch (section) {
      case 'waiting':
        return hasQueues(s.queues) ? <WaitingArea q={s.queues} cell={cell} /> : <Nothing />;
      case 'help':
        if (support.loading && !support.data) return <Skeleton height={180} radius={Radius.xl} />;
        return support.data ? <HelpArea desk={support.data} cell={cell} /> : <Nothing />;
      case 'people':
        return s.people ? <PeopleArea people={s.people} staff={overview.data?.staff} cell={cell} /> : <Nothing />;
      case 'money':
        return s.money ? <MoneyArea m={s.money} cell={cell} /> : <Nothing />;
      case 'businesses': {
        const shown = BUSINESS_MODULES.map((m) => blocks.find((b) => b.module === m)).filter((b) => b !== undefined);
        if (!shown.length) return <Nothing />;
        return (
          <View style={styles.grid}>
            {shown.map((b) => (
              <SectionTile
                key={b.module}
                icon={MODULE_ICON[b.module]}
                label={MODULE_LABEL[b.module]}
                line={moduleLine(b, count)}
                warn={!!b.businesses?.takenDown}
                tint="purple"
                width={half}
                onPress={() => router.push({ pathname: '/(admin)/dashboard/[section]', params: { section: b.module } })}
              />
            ))}
          </View>
        );
      }
      default: {
        const block = blocks.find((b) => b.module === section);
        return block ? <ModuleStats block={block} cell={cell} title="Numbers" /> : <Nothing />;
      }
    }
  };

  return (
    <ScreenContainer title={titleOf(section)}>
      {loading ? <Skeleton height={220} radius={Radius.xl} /> : null}
      {!s && !stats.loading && stats.error ? (
        <EmptyState icon="cloud-offline-outline" title="Could not load this" message="Check your connection and try again." actionLabel="Try again" onAction={reload} />
      ) : null}
      {s ? <Text style={consoleStyles.muted}>{asOfText(s.asOf)}. Tap a number to open its list.</Text> : null}
      <View style={styles.body}>{body()}</View>
    </ScreenContainer>
  );
}

function Nothing() {
  return <EmptyState icon="lock-closed-outline" title="Nothing to show here" message="This part isn't in your access, or it has no numbers yet." />;
}

function NotFound() {
  const router = useRouter();
  return (
    <ScreenContainer title="Dashboard">
      <EmptyState icon="grid-outline" title="Not found" message="This link doesn't point to a dashboard section." actionLabel="Back to the dashboard" onAction={() => router.back()} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  body: { gap: Spacing.three, paddingTop: Spacing.two },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GRID_GAP },
});

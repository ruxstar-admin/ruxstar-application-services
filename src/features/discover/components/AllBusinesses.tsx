import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { TextLink } from '@/components/ui/TextLink';
import { Brand, Spacing, Typography } from '@/constants/theme';
import { CourseCardView } from '@/features/coaching/components/CourseCardView';
import { EventCardView } from '@/features/events/components/EventCardView';
import { GigCardView } from '@/features/gigs/components/GigCardView';
import { ShopCardView } from '@/features/pod/components/ShopCardView';
import { PropertyCardView } from '@/features/stays/components/PropertyCardView';
import { StoreCardView } from '@/features/store/components/StoreCardView';
import { GroundCardView } from '@/features/turf/components/GroundCardView';
import { BUSINESS_MODULES } from '@/features/vendor/lib/business-modules';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { useAuthToken } from '@/hooks/use-auth-token';
import { CoachingService } from '@/services/coaching-service';
import { EventsService } from '@/services/events-service';
import { GigsService } from '@/services/gigs-service';
import { ShopService } from '@/services/shop-service';
import { StaysService } from '@/services/stays-service';
import { StoreService } from '@/services/store-service';
import { TurfService } from '@/services/turf-service';
import type { BusinessModule } from '@/types/business';

/** How many of each kind the All page shows before "See all". */
const PER_SECTION = 3;

type Router = ReturnType<typeof useRouter>;

/** The first few of one kind, and how to draw one. */
function load(module: BusinessModule, token: string, q: string, router: Router): Promise<ReactNode[]> | null {
  const query = q ? { q } : {};
  const first = <T,>(page: Promise<{ items: T[] }>) => page.then((p) => p.items.slice(0, PER_SECTION));
  switch (module) {
    case 'pod':
      return first(ShopService.list(token, query)).then((items) =>
        items.map((s) => <ShopCardView key={s.id} shop={s} onPress={() => router.push({ pathname: '/(customer)/pod/shop/[id]', params: { id: s.id } })} />),
      );
    case 'events':
      return first(EventsService.list(token, query)).then((items) =>
        items.map((e) => <EventCardView key={e.id} event={e} onPress={() => router.push({ pathname: '/(customer)/events/[id]', params: { id: e.id } })} />),
      );
    case 'coaching':
      return first(CoachingService.list(token, query)).then((items) =>
        items.map((c) => <CourseCardView key={c.id} course={c} onPress={() => router.push({ pathname: '/(customer)/coaching/[id]', params: { id: c.id } })} />),
      );
    case 'turf':
      return first(TurfService.list(token, query)).then((items) =>
        items.map((g) => <GroundCardView key={g.id} ground={g} onPress={() => router.push({ pathname: '/(customer)/turf/[id]', params: { id: g.id } })} />),
      );
    case 'stays':
      return first(StaysService.list(token, query)).then((items) =>
        items.map((p) => <PropertyCardView key={p.id} property={p} onPress={() => router.push({ pathname: '/(customer)/stays/[id]', params: { id: p.id } })} />),
      );
    case 'shop':
      return first(StoreService.list(token, query)).then((items) =>
        items.map((s) => <StoreCardView key={s.id} store={s} onPress={() => router.push({ pathname: '/(customer)/store/[id]', params: { id: s.id } })} />),
      );
    case 'gigs':
      return first(GigsService.list(token, query)).then((items) =>
        items.map((g) => <GigCardView key={g.id} gig={g} onPress={() => router.push({ pathname: '/(customer)/gigs/[id]', params: { id: g.id } })} />),
      );
    default:
      return null;
  }
}

function Section({ module, q, round, onSeeAll, onShown }: { module: BusinessModule; q: string; round: number; onSeeAll: () => void; onShown: (module: BusinessModule, shown: boolean) => void }) {
  const router = useRouter();
  const token = useAuthToken();
  const { data, error, loading, reload } = useAsyncResource(() => load(module, token, q, router) ?? Promise.resolve([]), `${module}|${q}|${round}`);
  const empty = !loading && !error && !data?.length;
  const settled = !loading || !!data;
  useEffect(() => {
    if (settled) onShown(module, !empty);
  }, [settled, empty, module, onShown]);
  if (empty) return null;
  const info = BUSINESS_MODULES[module];
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <Ionicons name={info.icon} size={18} color={Brand.primarySoft} />
        <Text style={styles.sectionTitle} accessibilityRole="header">
          {info.label}
        </Text>
        {data?.length ? <TextLink label="See all" onPress={onSeeAll} /> : null}
      </View>
      {loading && !data ? (
        <View style={styles.skeletons}>
          <Skeleton height={190} radius={18} />
          <Skeleton height={16} width="60%" />
        </View>
      ) : error && !data ? (
        <TextLink muted label={`Couldn’t load ${info.label.toLowerCase()}. Try again`} onPress={reload} />
      ) : (
        <View style={styles.cards}>{data}</View>
      )}
    </View>
  );
}

/** Every kind of business at once, a few of each, until the customer picks a filter. The search box searches them all. */
export function AllBusinesses({ modules, q, onPick }: { modules: readonly BusinessModule[]; q: string; onPick: (module: BusinessModule) => void }) {
  const [round, setRound] = useState(0);
  const [shown, setShown] = useState<Partial<Record<BusinessModule, boolean>>>({});
  const settled = modules.every((m) => shown[m] !== undefined);
  const nothing = settled && modules.every((m) => !shown[m]);
  const mark = useCallback((module: BusinessModule, on: boolean) => setShown((s) => (s[module] === on ? s : { ...s, [module]: on })), []);

  return (
    <ScrollView
      contentContainerStyle={styles.list}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      refreshControl={<RefreshControl refreshing={false} onRefresh={() => setRound((r) => r + 1)} tintColor={Brand.primarySoft} />}
    >
      {modules.map((m) => (
        <Section key={m} module={m} q={q} round={round} onSeeAll={() => onPick(m)} onShown={mark} />
      ))}
      {nothing ? (
        <EmptyState
          icon="storefront-outline"
          title={q ? 'Nothing matches' : 'No businesses yet'}
          message={q ? 'Try another name or city.' : 'Businesses on Ruxstar show up here as soon as they open.'}
        />
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.five, gap: Spacing.five, flexGrow: 1 },
  section: { gap: Spacing.three },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  sectionTitle: { ...Typography.bodyStrong, fontSize: 17, color: Brand.text, flex: 1 },
  cards: { gap: Spacing.three },
  skeletons: { gap: Spacing.two },
});

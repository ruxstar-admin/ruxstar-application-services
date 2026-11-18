import type { Href } from 'expo-router';
import type { ModuleName, Stats, StatsModule, StatsModuleBlock } from '@/types/admin';

type ListingKind = NonNullable<StatsModuleBlock['listings']>['kind'];

const STATS_MODULES: readonly StatsModule[] = ['pod', 'events', 'coaching', 'turf', 'stays', 'shop', 'gigs', 'delivery'];

export const isStatsModule = (m: ModuleName): m is StatsModule => (STATS_MODULES as readonly string[]).includes(m);

/** Where a module's numbers open: its console list, or its settings when it has none. */
export const MODULE_LIST: Record<StatsModule, Href> = {
  pod: '/(admin)/businesses',
  events: '/(admin)/events',
  coaching: '/(admin)/coaching',
  turf: '/(admin)/grounds',
  stays: '/(admin)/properties',
  shop: '/(admin)/stores',
  gigs: '/(admin)/freelancers',
  delivery: { pathname: '/(admin)/modules/[module]', params: { module: 'delivery' } },
};

/** Modules whose orders the console lists on their own. */
export const MODULE_ORDERS: Partial<Record<StatsModule, Href>> = {
  shop: '/(admin)/store-orders',
  gigs: '/(admin)/gig-orders',
};

const LISTINGS: Record<ListingKind, string> = {
  event: 'Live events',
  course: 'Live courses',
  ground: 'Live grounds',
  property: 'Live PGs & hostels',
  product: 'Products on sale',
  gig: 'Live gigs',
};

export const listingsLabel = (kind: ListingKind) => LISTINGS[kind] ?? 'Live listings';

export const ordersWord = (module: StatsModule) => (module === 'delivery' ? 'Trips' : module === 'turf' || module === 'stays' ? 'Bookings' : 'Orders');

/** "Counted just now", "Counted 3 min ago", or the clock time after an hour. */
export function asOfText(iso: string, now: number = Date.now()): string {
  const minutes = Math.floor(Math.max(0, now - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return 'Counted just now';
  if (minutes < 60) return `Counted ${minutes} min ago`;
  return `Counted at ${new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}`;
}

/** Queues with at least one count this person may see. */
export const hasQueues = (q: Stats['queues']): q is NonNullable<Stats['queues']> => !!q && Object.values(q).some((n) => n !== null);

/** A module block with nothing this person may see. */
export const blockEmpty = (b: StatsModuleBlock) => !b.businesses && !b.listings && !b.orders && !b.money;

/** Blocks the dashboard can draw: a module this app knows, with something in it. */
export const shownBlocks = (blocks: StatsModuleBlock[] | undefined) => (blocks ?? []).filter((b) => isStatsModule(b.module) && !blockEmpty(b));

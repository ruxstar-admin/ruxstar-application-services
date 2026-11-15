import type { Stats, StatsModule, StatsModuleBlock } from '@/types/admin';
import type { SupportSummary } from '@/types/support';
import type { Icon, Tint } from '../components/tiles';

/** The dashboard's areas, each a tile on the home and a screen of its own. */
export type DashboardArea = 'waiting' | 'help' | 'people' | 'money' | 'businesses';

/** Modules under Businesses, in the order the owner reads them. Delivery has its own tile. */
export const BUSINESS_MODULES: readonly StatsModule[] = ['events', 'pod', 'coaching', 'turf', 'stays', 'shop'];

export const AREA: Record<DashboardArea, { label: string; icon: Icon; tint: Tint }> = {
  waiting: { label: 'Waiting for Ruxstar', icon: 'alert-circle-outline', tint: 'amber' },
  help: { label: 'Help tickets', icon: 'help-buoy-outline', tint: 'blue' },
  people: { label: 'People', icon: 'people-outline', tint: 'purple' },
  money: { label: 'Money', icon: 'wallet-outline', tint: 'green' },
  businesses: { label: 'Businesses', icon: 'storefront-outline', tint: 'purple' },
};

const AREAS = Object.keys(AREA) as DashboardArea[];
const STATS_MODULES: readonly string[] = [...BUSINESS_MODULES, 'delivery'];

/** A dashboard screen's key from a link: an area, or one module's numbers. */
export type DashboardSection = DashboardArea | StatsModule;

export const isDashboardSection = (value: unknown): value is DashboardSection =>
  typeof value === 'string' && ((AREAS as string[]).includes(value) || STATS_MODULES.includes(value));

/** Everything waiting for Ruxstar that this person may see. */
export const queueTotal = (q: Stats['queues']) => (q ? Object.values(q).reduce<number>((sum, n) => sum + (n ?? 0), 0) : 0);

/** Tickets that need someone now: past their reply-by time, or with nobody on them. */
export const ticketsNeedingYou = (desk: SupportSummary) => desk.overdue + desk.unassigned;

/** Live businesses across the given module blocks. */
export const liveBusinesses = (blocks: StatsModuleBlock[]) => blocks.reduce((sum, b) => sum + (b.businesses?.live ?? 0), 0);

/** One line under a module's tile: what is happening there right now. */
export function moduleLine(b: StatsModuleBlock, count: (n: number) => string): string {
  if (b.module === 'delivery' && b.orders) return `${count(b.orders.open)} under way`;
  if (b.businesses) return `${count(b.businesses.live)} live`;
  if (b.listings) return `${count(b.listings.live)} live`;
  if (b.orders) return `${count(b.orders.today)} today`;
  return 'Open';
}

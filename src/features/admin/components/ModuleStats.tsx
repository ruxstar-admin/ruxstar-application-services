import { useRouter, type Href } from 'expo-router';
import { money } from '@/features/vendor/lib/pod';
import type { StatsModuleBlock } from '@/types/admin';
import { MODULE_LABEL } from '../labels';
import { MODULE_ICON } from '../lib/modules';
import { MODULE_LIST, MODULE_ORDERS, listingsLabel, ordersWord } from '../lib/stats';
import { MetricTile, TileCard } from './tiles';

const count = (n: number) => n.toLocaleString('en-IN');

/** One module's numbers from the stats route, each opening the module's console list. */
export function ModuleStats({ block, cell, flat, title, unlinked }: { block: StatsModuleBlock; cell: number; flat?: boolean; title?: string; unlinked?: boolean }) {
  const router = useRouter();
  const go = (href: Href) => (unlinked ? undefined : () => router.push(href));
  const list = go(MODULE_LIST[block.module]);
  const orders = go(MODULE_ORDERS[block.module] ?? MODULE_LIST[block.module]);
  const word = ordersWord(block.module);
  const { businesses: b, listings: l, orders: o, money: m } = block;

  return (
    <TileCard title={title ?? MODULE_LABEL[block.module]} icon={MODULE_ICON[block.module]} tint="purple" flat={flat}>
      {b ? (
        <>
          <MetricTile label="Live businesses" value={count(b.live)} width={cell} onPress={list} />
          <MetricTile label="Drafts" value={count(b.drafts)} tone="quiet" width={cell} onPress={list} />
          <MetricTile label="On hold" value={count(b.takenDown)} tone={b.takenDown ? 'warn' : 'plain'} width={cell} onPress={list} />
        </>
      ) : null}
      {l ? (
        <>
          <MetricTile label={listingsLabel(l.kind)} value={count(l.live)} width={cell} onPress={list} />
          <MetricTile label="Taken down" value={count(l.takenDown)} tone="quiet" width={cell} onPress={list} />
        </>
      ) : null}
      {o ? (
        <>
          <MetricTile label={`${word} today`} value={count(o.today)} width={cell} onPress={orders} />
          <MetricTile label={`${word} this week`} value={count(o.thisWeek)} width={cell} onPress={orders} />
          <MetricTile label="Under way" value={count(o.open)} width={cell} onPress={orders} />
        </>
      ) : null}
      {m ? (
        <>
          <MetricTile label="Collected today" value={money(m.collectedToday)} tone="good" width={cell} />
          <MetricTile label="This week" value={money(m.collectedThisWeek)} width={cell} />
          <MetricTile label="This month" value={money(m.collectedThisMonth)} width={cell} />
          <MetricTile label="Refunded this month" value={money(m.refundsThisMonth)} tone={m.refundsThisMonth ? 'warn' : 'plain'} width={cell} />
          <MetricTile label="Held for vendors" value={money(m.held)} width={cell} />
        </>
      ) : null}
    </TileCard>
  );
}

import { useRouter, type Href } from 'expo-router';
import { money } from '@/features/vendor/lib/pod';
import type { Overview, PayoutTotal, Stats } from '@/types/admin';
import type { SupportSummary } from '@/types/support';
import { MetricTile, TileCard } from './tiles';

const count = (n: number) => n.toLocaleString('en-IN');
const waiting = (n: number) => (n > 0 ? 'warn' : 'plain');
const payoutLabel = (label: string, p: PayoutTotal) => `${label} (${count(p.count)})`;

function useGo() {
  const router = useRouter();
  return (href: Href) => () => router.push(href);
}

export function WaitingArea({ q, cell }: { q: NonNullable<Stats['queues']>; cell: number }) {
  const go = useGo();
  return (
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
      {q.gigDisputes != null ? (
        <MetricTile
          label="Freelance problems"
          value={count(q.gigDisputes)}
          tone={waiting(q.gigDisputes)}
          width={cell}
          onPress={go({ pathname: '/(admin)/gig-orders', params: { status: 'disputed' } })}
        />
      ) : null}
    </TileCard>
  );
}

export function HelpArea({ desk, cell }: { desk: SupportSummary; cell: number }) {
  const go = useGo();
  return (
    <TileCard title="Help tickets" icon="help-buoy-outline" tint="blue">
      <MetricTile label="Past reply-by" value={count(desk.overdue)} tone={waiting(desk.overdue)} width={cell} onPress={go('/(admin)/support')} />
      <MetricTile label="With nobody on them" value={count(desk.unassigned)} tone={waiting(desk.unassigned)} width={cell} onPress={go('/(admin)/support')} />
      <MetricTile label="Assigned to you" value={count(desk.mine)} width={cell} onPress={go('/(admin)/support')} />
      <MetricTile label="Waiting on the person" value={count(desk.waiting)} tone="quiet" width={cell} onPress={go('/(admin)/support')} />
    </TileCard>
  );
}

export function PeopleArea({ people, staff, cell }: { people: NonNullable<Stats['people']>; staff?: Overview['staff']; cell: number }) {
  const go = useGo();
  const list = go('/(admin)/(tabs)/people');
  return (
    <TileCard title="People" icon="people-outline" tint="purple">
      <MetricTile label="Accounts" value={count(people.total)} width={cell} onPress={list} />
      <MetricTile label="Joined today" value={count(people.joinedToday)} width={cell} onPress={list} />
      <MetricTile label="Joined this week" value={count(people.joinedThisWeek)} width={cell} onPress={list} />
      <MetricTile label="Verified" value={count(people.verified)} tone="good" width={cell} onPress={list} />
      <MetricTile label="On hold" value={count(people.onHold)} tone="quiet" width={cell} onPress={list} />
      {staff ? <MetricTile label="Ruxstar staff" value={count(staff.active)} width={cell} onPress={go('/(admin)/staff')} /> : null}
    </TileCard>
  );
}

export function MoneyArea({ m, cell }: { m: NonNullable<Stats['money']>; cell: number }) {
  const go = useGo();
  const payouts = go('/(admin)/payouts');
  return (
    <TileCard title="Money" icon="wallet-outline" tint="green">
      <MetricTile label="Collected today" value={money(m.collectedToday)} tone="good" width={cell} />
      <MetricTile label="This week" value={money(m.collectedThisWeek)} width={cell} />
      <MetricTile label="This month" value={money(m.collectedThisMonth)} width={cell} />
      <MetricTile label="Refunded today" value={money(m.refundsToday)} width={cell} />
      <MetricTile label="Refunded this month" value={money(m.refundsThisMonth)} width={cell} />
      <MetricTile label="Held for vendors and partners" value={money(m.held)} width={cell} onPress={payouts} />
      <MetricTile label={payoutLabel('Withdrawals on the way', m.payouts.pending)} value={money(m.payouts.pending.amount)} width={cell} onPress={payouts} />
      <MetricTile
        label={payoutLabel('Failed withdrawals', m.payouts.failed)}
        value={money(m.payouts.failed.amount)}
        tone={waiting(m.payouts.failed.count)}
        width={cell}
        onPress={payouts}
      />
      <MetricTile label={payoutLabel('Paid out this month', m.payouts.paidThisMonth)} value={money(m.payouts.paidThisMonth.amount)} width={cell} onPress={payouts} />
    </TileCard>
  );
}

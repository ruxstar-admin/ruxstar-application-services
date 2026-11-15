import { useAsyncResource } from '@/hooks/use-async-resource';
import { useAuthToken } from '@/hooks/use-auth-token';
import { AdminService } from '@/services/admin-service';
import { SupportDeskService } from '@/services/support-service';
import { allows, useAccess } from '../access';

/** How many a list's first page holds; `more` when it has further pages, so it reads "20+". */
export interface PageCount {
  n: number;
  more: boolean;
}

const countOf = (page: { items: unknown[]; nextCursor: string | null }): PageCount => ({ n: page.items.length, more: page.nextCursor !== null });

export const pageCountText = (c: PageCount) => `${c.n.toLocaleString('en-IN')}${c.more ? '+' : ''}`;

/**
 * Everything the console dashboard counts, each source loaded at the same time and on its own, so a
 * slow or failing one does not hold the others back. Payouts have no count route: their queues are
 * counted from the first page of each list.
 */
export function useConsoleMetrics() {
  const token = useAuthToken();
  const access = useAccess();
  const desk = allows(access, 'support.view');
  const money = allows(access, 'payouts.view');

  const overview = useAsyncResource(() => AdminService.getOverview(token));
  const support = useAsyncResource(() => (desk ? SupportDeskService.summary(token) : Promise.resolve(null)));
  const payouts = useAsyncResource(() =>
    money
      ? Promise.all([AdminService.payouts(token, 'pending'), AdminService.payouts(token, 'failed'), AdminService.heldOrders(token)]).then(([pending, failed, held]) => ({
          pending: countOf(pending),
          failed: countOf(failed),
          held: countOf(held),
        }))
      : Promise.resolve(null),
  );

  const reload = () => {
    overview.reload();
    support.reload();
    payouts.reload();
  };
  const refreshing = (overview.loading && !!overview.data) || (support.loading && support.data !== undefined) || (payouts.loading && payouts.data !== undefined);

  return { overview, support, payouts, reload, refreshing };
}

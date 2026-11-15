import { useAsyncResource } from '@/hooks/use-async-resource';
import { useAuthToken } from '@/hooks/use-auth-token';
import { AdminService } from '@/services/admin-service';
import { SupportDeskService } from '@/services/support-service';
import { allows, useAccess } from '../access';

/**
 * Everything the console dashboard shows, each source loaded at the same time and on its own, so a
 * slow or failing one does not hold the others back. The stats route has every count; the overview
 * adds staff and which modules are live, and the help desk summary adds who tickets wait on.
 */
export function useConsoleMetrics() {
  const token = useAuthToken();
  const access = useAccess();
  const desk = allows(access, 'support.view');

  const stats = useAsyncResource(() => AdminService.stats(token), 'console-stats');
  const overview = useAsyncResource(() => AdminService.getOverview(token), 'console-overview');
  const support = useAsyncResource(() => (desk ? SupportDeskService.summary(token) : Promise.resolve(null)), `console-desk-${desk}`);

  const reload = () => {
    stats.reload();
    overview.reload();
    support.reload();
  };
  const refreshing = (stats.loading && !!stats.data) || (overview.loading && !!overview.data) || (support.loading && !!support.data);

  return { stats, overview, support, reload, refreshing };
}

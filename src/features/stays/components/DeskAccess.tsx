import { AsyncBoundary } from '@/components/ui/AsyncBoundary';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { useAuthToken } from '@/hooks/use-auth-token';
import { StaysService, StaysDeskService } from '@/services/stays-service';
import type { StaysPermission } from '@/types/stays';
import { deskCan } from '../lib/stays';

/** Finds the property among the ones you run; with `permission`, only when you hold it there. */
export function useDeskProperty(id: string, permission?: StaysPermission) {
  const token = useAuthToken();
  const { data, loading, error, reload } = useAsyncResource(() => StaysDeskService.properties(token), 'stays-desk');
  const property = data?.find((p) => p.id === id);
  return { property: property && (!permission || deskCan(property, permission)) ? property : undefined, loaded: !!data, loading, error, reload };
}

/** The property's public listing, for desk screens that need its rooms or details. */
export function useListing(id: string) {
  const token = useAuthToken();
  return useAsyncResource(() => StaysService.get(token, id), id);
}

/** While the desk list loads, or when the property isn't one you can open this way. */
export function NoDeskAccess({ title, loaded, loading, error, reload }: { title: string; loaded: boolean; loading: boolean; error: unknown; reload: () => void }) {
  return (
    <ScreenContainer title={title}>
      {loaded ? (
        <EmptyState icon="lock-closed-outline" title="You can’t open this" message="The property isn’t yours, or the owner hasn’t given you this permission." />
      ) : (
        <AsyncBoundary loading={loading} error={error} hasData={false} onRetry={reload} skeletonRows={4}>
          {null}
        </AsyncBoundary>
      )}
    </ScreenContainer>
  );
}

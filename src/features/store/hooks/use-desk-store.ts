import { useAsyncResource } from '@/hooks/use-async-resource';
import { useAuthToken } from '@/hooks/use-auth-token';
import { StoreDeskService } from '@/services/store-service';
import type { DeskStore } from '@/types/store';

/** One shop at the desk and what the signed-in person can do there. The owner can do everything. */
export function useDeskStore(storeId: string) {
  const token = useAuthToken();
  const { data, loading, error, reload } = useAsyncResource(() => StoreDeskService.stores(token), 'store-desk');
  const store: DeskStore | undefined = data?.find((s) => s.id === storeId);
  const can = (permission: string) => !!store && (store.owner || store.permissions.includes(permission));
  return { store, can, loading, error, reload };
}

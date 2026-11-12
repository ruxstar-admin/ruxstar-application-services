import { useAsyncResource } from '@/hooks/use-async-resource';
import { useAuthToken } from '@/hooks/use-auth-token';
import { BusinessService } from '@/services/business-service';
import type { BusinessCatalog } from '@/types/business';

let cached: BusinessCatalog | null = null;

/** The catalog changes only when the Ruxstar team switches a module, so one fetch per app session is enough. Pass `fresh` to re-read module state. */
export function useBusinessCatalog({ fresh = false } = {}) {
  const token = useAuthToken();
  return useAsyncResource(async () => {
    if (cached && !fresh) return cached;
    cached = await BusinessService.catalog(token);
    return cached;
  });
}

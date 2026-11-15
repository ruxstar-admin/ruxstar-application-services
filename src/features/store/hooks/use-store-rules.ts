import { useAsyncResource } from '@/hooks/use-async-resource';
import { useAuthToken } from '@/hooks/use-auth-token';
import { StoreService } from '@/services/store-service';
import type { StoreRules } from '@/types/store';

/** Ruxstar's defaults, used until the rules load or when they can't. */
export const DEFAULT_STORE_RULES: StoreRules = {
  returnDays: 2,
  maxOptions: 2,
  releaseHours: 48,
  holdMinutes: 15,
  acceptHours: 6,
  maxProducts: 500,
  maxVariants: 50,
  maxValues: 10,
  maxLines: 20,
  maxQuantity: 20,
  commissionBps: 0,
  platformFee: 0,
};

/** Ruxstar's shop limits: lines per order, pieces per line, options and variants. */
export function useStoreRules(): StoreRules {
  const token = useAuthToken();
  const { data } = useAsyncResource(() => StoreService.rules(token), 'store-rules');
  return data ?? DEFAULT_STORE_RULES;
}

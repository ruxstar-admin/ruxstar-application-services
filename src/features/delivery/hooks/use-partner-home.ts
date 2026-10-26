import { useEffect } from 'react';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { useAuthToken } from '@/hooks/use-auth-token';
import { useRefetchOnFocus } from '@/hooks/use-refetch-on-focus';
import { DeliveryService } from '@/services/delivery-service';

const POLL_MS = 10_000;

/** The partner's live picture (duty state, offers, active job). Refreshes on focus and every 10 s so new offers appear. */
export function usePartnerHome() {
  const token = useAuthToken();
  const home = useAsyncResource(() => DeliveryService.home(token));
  const { reload } = home;
  useRefetchOnFocus(reload);

  useEffect(() => {
    const timer = setInterval(reload, POLL_MS);
    return () => clearInterval(timer);
  }, [reload]);

  return home;
}

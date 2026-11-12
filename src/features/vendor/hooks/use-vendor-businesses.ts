import { useState } from 'react';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { useAuthToken } from '@/hooks/use-auth-token';
import { useRefetchOnFocus } from '@/hooks/use-refetch-on-focus';
import { ApiError } from '@/lib/api-error';
import { Feedback } from '@/lib/haptics';
import { BusinessService } from '@/services/business-service';
import type { Business } from '@/types/business';

/** Only a live business that is not on hold, in a module Ruxstar has not paused, can open and close. */
export const canOpen = (b: Business) => b.status === 'live' && !b.suspension && b.moduleLive;

const messageOf = (err: unknown) =>
  err instanceof ApiError && err.kind !== 'network' && err.kind !== 'timeout' ? err.message : 'Could not reach Ruxstar. Check your connection and try again.';

/** The vendor's businesses, reloaded on focus, with open and close. Switches flip at once and go back if the API refuses. */
export function useVendorBusinesses() {
  const token = useAuthToken();
  const resource = useAsyncResource(() => BusinessService.list(token));
  const { data, reload, setData } = resource;
  useRefetchOnFocus(reload);
  const [busy, setBusy] = useState<Set<string>>(new Set());
  const [failure, setFailure] = useState<string | null>(null);

  const patch = (id: string, changes: Partial<Business>) =>
    setData((list) => (list ?? []).map((b) => (b.id === id ? { ...b, ...changes } : b)));
  const mark = (ids: string[], on: boolean) =>
    setBusy((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => (on ? next.add(id) : next.delete(id)));
      return next;
    });

  const setOpen = async (targets: Business[], open: boolean) => {
    const ids = targets.map((b) => b.id);
    if (!ids.length) return;
    Feedback.select();
    setFailure(null);
    ids.forEach((id) => patch(id, { open }));
    mark(ids, true);
    const results = await Promise.allSettled(ids.map((id) => BusinessService.setOpen(token, id, open)));
    mark(ids, false);
    let failed = 0;
    let lastError: unknown = null;
    results.forEach((r, i) => {
      if (r.status === 'fulfilled') patch(ids[i], r.value);
      else {
        failed += 1;
        lastError = r.reason;
        patch(ids[i], { open: !open });
      }
    });
    if (!failed) return Feedback.success();
    Feedback.error();
    setFailure(
      ids.length === 1 ? messageOf(lastError) : `Could not ${open ? 'open' : 'close'} ${failed} of ${ids.length} businesses. ${messageOf(lastError)}`,
    );
    reload();
  };

  return {
    ...resource,
    openable: (data ?? []).filter(canOpen),
    busy,
    failure,
    setOne: (business: Business, open: boolean) => setOpen([business], open),
  };
}

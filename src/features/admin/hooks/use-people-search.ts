import { useEffect, useState } from 'react';
import { useAuthToken } from '@/hooks/use-auth-token';
import { AdminService } from '@/services/admin-service';
import type { AccountRow, AccountStatus } from '@/types/admin';
import { errorText } from '../components/parts';

/** Waits this long after the last keystroke before searching. */
const SEARCH_DELAY_MS = 300;
const MIN_LENGTH = 2;
const LIMIT = 8;

/**
 * People matching a phone number, @username or name, searched as the text settles. `results` is null until
 * there are at least two characters; `searching` is true while the shown results are for older text.
 */
export function usePeopleSearch(text: string, status?: AccountStatus) {
  const token = useAuthToken();
  const q = text.trim();
  const [found, setFound] = useState<{ q: string; items: AccountRow[]; error: string | null } | null>(null);

  useEffect(() => {
    if (q.length < MIN_LENGTH) return;
    let live = true;
    const timer = setTimeout(() => {
      AdminService.findAccounts(token, q, status).then(
        (page) => live && setFound({ q, items: page.items.slice(0, LIMIT), error: null }),
        (err) => live && setFound((prev) => ({ q, items: prev?.items ?? [], error: errorText(err) })),
      );
    }, SEARCH_DELAY_MS);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [q, status, token]);

  const active = q.length >= MIN_LENGTH;
  return {
    results: active && found ? found.items : null,
    error: active ? (found?.error ?? null) : null,
    searching: active && found?.q !== q,
  };
}

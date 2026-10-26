import { useCallback, useEffect, useRef, useState } from 'react';
import type { Page } from '@/types/social';

/**
 * Cursor-paginated list: first page on mount (and on `retry()`), `refresh()` for pull-to-refresh,
 * `loadMore()` for endless scroll. One request at a time, so a fast scroll can never fetch the same
 * page twice. `setItems` supports optimistic edits (likes, deletes) without refetching.
 */
export function usePaginated<T>(loadPage: (cursor?: string) => Promise<Page<T>>) {
  const loadRef = useRef(loadPage);
  const cursorRef = useRef<string | null>(null);
  const inFlight = useRef(false);

  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<unknown>(undefined);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    loadRef.current = loadPage;
  });

  const settle = useCallback((page: Page<T> | null, failure?: unknown, append = false) => {
    if (page) {
      cursorRef.current = page.nextCursor;
      setItems((prev) => (append ? [...prev, ...page.items] : page.items));
    }
    setError(failure);
    setLoading(false);
    setRefreshing(false);
    setLoadingMore(false);
    inFlight.current = false;
  }, []);

  useEffect(() => {
    let cancelled = false;
    inFlight.current = true;
    loadRef
      .current()
      .then((page) => !cancelled && settle(page))
      .catch((err) => !cancelled && settle(null, err));
    return () => {
      cancelled = true;
    };
  }, [attempt, settle]);

  const refresh = useCallback(() => {
    if (inFlight.current) return;
    inFlight.current = true;
    setRefreshing(true);
    loadRef
      .current()
      .then((page) => settle(page))
      .catch((err) => settle(null, err));
  }, [settle]);

  const loadMore = useCallback(() => {
    if (inFlight.current || cursorRef.current === null) return;
    inFlight.current = true;
    setLoadingMore(true);
    loadRef
      .current(cursorRef.current)
      .then((page) => settle(page, undefined, true))
      .catch((err) => settle(null, err));
  }, [settle]);

  const retry = useCallback(() => {
    setLoading(true);
    setAttempt((n) => n + 1);
  }, []);

  return { items, setItems, loading, refreshing, loadingMore, error, refresh, loadMore, retry };
}

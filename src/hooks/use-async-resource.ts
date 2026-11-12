import { useCallback, useEffect, useRef, useState } from 'react';

interface ResourceState<T> {
  data?: T;
  error?: unknown;
  loading: boolean;
}

/**
 * Loads data on mount and on `reload()`. Keeps the previous data visible while reloading, drops
 * results from an unmounted or superseded request, and exposes `setData` for optimistic updates.
 * Pass `key` to refetch automatically when the inputs of `load` change (e.g. dates, filters).
 */
export function useAsyncResource<T>(load: () => Promise<T>, key?: string) {
  const loadRef = useRef(load);
  const [state, setState] = useState<ResourceState<T>>({ loading: true });
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    loadRef.current = load;
  });

  useEffect(() => {
    let cancelled = false;
    loadRef
      .current()
      .then((data) => !cancelled && setState({ data, loading: false }))
      .catch((error) => !cancelled && setState((prev) => ({ data: prev.data, error, loading: false })));
    return () => {
      cancelled = true;
    };
  }, [nonce, key]);

  const reload = useCallback(() => {
    setState((prev) => ({ data: prev.data, loading: true }));
    setNonce((n) => n + 1);
  }, []);

  /** A value, or an update from the latest data so several updates in a row do not overwrite each other. */
  const setData = useCallback(
    (next: T | ((prev: T | undefined) => T)) =>
      setState((prev) => ({ data: typeof next === 'function' ? (next as (prev: T | undefined) => T)(prev.data) : next, loading: false })),
    [],
  );

  return { ...state, reload, setData };
}

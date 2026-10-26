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

  const setData = useCallback((data: T) => setState({ data, loading: false }), []);

  return { ...state, reload, setData };
}

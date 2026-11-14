import { useCallback, useLayoutEffect, useRef } from 'react';

/**
 * A press handler whose identity never changes but always calls the latest `handler`, so long lists of memoised cells
 * don't all re-render when the parent passes a new inline function. Only call the result from events, not during render.
 */
export function useStableHandler<A extends unknown[]>(handler: (...args: A) => void): (...args: A) => void {
  const latest = useRef(handler);
  useLayoutEffect(() => {
    latest.current = handler;
  });
  return useCallback((...args: A) => latest.current(...args), []);
}

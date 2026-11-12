import { useCallback, useEffect, useRef } from 'react';
import { useFocusEffect } from 'expo-router';

/**
 * Calls `reload` each time the screen regains focus, except the first (the initial load already covers it).
 * `reload` may be a new function every render: the focus effect must not re-run because of it, or a reload
 * that sets state would loop forever.
 */
export function useRefetchOnFocus(reload: () => void) {
  const first = useRef(true);
  const latest = useRef(reload);
  useEffect(() => {
    latest.current = reload;
  });

  useFocusEffect(
    useCallback(() => {
      if (first.current) {
        first.current = false;
        return;
      }
      latest.current();
    }, []),
  );
}

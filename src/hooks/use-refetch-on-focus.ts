import { useCallback, useRef } from 'react';
import { useFocusEffect } from 'expo-router';

/** Calls `reload` each time the screen regains focus, except the first (the initial load already covers it). */
export function useRefetchOnFocus(reload: () => void) {
  const first = useRef(true);

  useFocusEffect(
    useCallback(() => {
      if (first.current) {
        first.current = false;
        return;
      }
      reload();
    }, [reload]),
  );
}

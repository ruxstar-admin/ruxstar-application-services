import { useEffect, useRef } from 'react';
import { Motion } from '@/constants/motion';

/**
 * Focuses a field after the screen's entrance animation has mostly finished, instead of
 * `autoFocus` slamming the keyboard up while the screen is still transitioning in.
 */
export function useDelayedFocus<T extends { focus: () => void }>(delay: number = Motion.duration.slow) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const timeout = setTimeout(() => ref.current?.focus(), delay);
    return () => clearTimeout(timeout);
  }, [delay]);

  return ref;
}

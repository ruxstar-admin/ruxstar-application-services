import { useEffect, useRef } from 'react';
import { Motion } from '@/constants/motion';

/**
 * Focuses a field after the screen's entrance animation has mostly finished, instead of
 * `autoFocus` slamming the keyboard up while the screen is still transitioning in.
 * Pass `enabled = false` to get a plain ref (e.g. for programmatic refocus) without the auto-focus.
 */
export function useDelayedFocus<T extends { focus: () => void }>(
  delay: number = Motion.duration.slow,
  enabled: boolean = true,
) {
  const ref = useRef<T>(null);

  useEffect(() => {
    if (!enabled) return;
    const timeout = setTimeout(() => ref.current?.focus(), delay);
    return () => clearTimeout(timeout);
  }, [delay, enabled]);

  return ref;
}

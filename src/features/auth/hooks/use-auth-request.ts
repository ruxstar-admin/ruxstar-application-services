import { useCallback, useRef, useState } from 'react';
import { toAuthError, type AuthAction, type AuthError, type AuthErrorTarget } from '@/features/auth/lib/auth-errors';
import { Feedback } from '@/lib/haptics';
import { reportError } from '@/lib/monitoring';

/**
 * Runs one auth request at a time: guards double-taps, tracks loading, converts any failure into
 * friendly copy with a target field, fires the error haptic, and reports real bugs to monitoring.
 */
export function useAuthRequest() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<AuthError | null>(null);
  const inFlight = useRef(false);

  const clearError = useCallback(() => setError(null), []);

  const run = useCallback(
    async <T>(
      action: AuthAction,
      task: () => Promise<T>,
      onError?: (error: AuthError) => void,
    ): Promise<T | undefined> => {
      if (inFlight.current) return undefined;
      inFlight.current = true;
      setError(null);
      setLoading(true);
      try {
        return await task();
      } catch (err) {
        const authError = toAuthError(err, action);
        reportError(err, action);
        Feedback.error();
        setError(authError);
        onError?.(authError);
        return undefined;
      } finally {
        inFlight.current = false;
        setLoading(false);
      }
    },
    [],
  );

  /** The message to show under a specific field, if the current error targets it. */
  const errorFor = (target: AuthErrorTarget) => (error?.target === target ? error.message : undefined);

  return { run, loading, error, errorFor, clearError };
}

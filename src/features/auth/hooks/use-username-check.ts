import { useEffect, useState } from 'react';
import { AccountService } from '@/services/account-service';
import { isValidUsername } from '@/features/auth/lib/validators';

export type UsernameStatus = 'idle' | 'checking' | 'available' | 'taken' | 'error';

const DEBOUNCE_MS = 450;

interface UsernameCheck {
  /** The username this result belongs to; results for older input are ignored. */
  for: string;
  status: Exclude<UsernameStatus, 'idle' | 'checking'>;
  suggestions: string[];
}

/** Debounced availability check. Stale responses are dropped, so fast typing never shows an old answer. */
export function useUsernameCheck(username: string) {
  const [result, setResult] = useState<UsernameCheck | null>(null);

  useEffect(() => {
    if (!isValidUsername(username)) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      AccountService.checkUsername(username)
        .then((res) => !cancelled && setResult({ for: username, status: res.available ? 'available' : 'taken', suggestions: res.suggestions }))
        .catch(() => !cancelled && setResult({ for: username, status: 'error', suggestions: [] }));
    }, DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [username]);

  if (!isValidUsername(username)) return { status: 'idle' as UsernameStatus, suggestions: [] as string[] };
  if (result?.for !== username) return { status: 'checking' as UsernameStatus, suggestions: [] as string[] };
  return { status: result.status as UsernameStatus, suggestions: result.suggestions };
}

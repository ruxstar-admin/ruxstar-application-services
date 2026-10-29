import { useEffect, useState } from 'react';
import { AccountService } from '@/services/account-service';
import { isValidName, isValidUsername } from '@/features/auth/lib/validators';

export type UsernameStatus = 'idle' | 'checking' | 'available' | 'taken' | 'error';

const DEBOUNCE_MS = 450;

interface UsernameCheck {
  /** The username this result belongs to; results for older input are ignored. */
  for: string;
  status: Exclude<UsernameStatus, 'idle' | 'checking'>;
  suggestions: string[];
}

/**
 * Debounced availability check. Stale responses are dropped, so fast typing never shows an old answer.
 * While the field is empty, `name` (before signup) seeds suggestions to tap.
 */
export function useUsernameCheck(username: string, name = '') {
  const [result, setResult] = useState<UsernameCheck | null>(null);
  const [ideas, setIdeas] = useState<{ for: string; list: string[] } | null>(null);
  const seed = name.trim();
  const wantIdeas = username.length === 0 && isValidName(seed);

  useEffect(() => {
    if (!isValidUsername(username)) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      AccountService.checkUsername(username, seed)
        .then((res) => !cancelled && setResult({ for: username, status: res.available ? 'available' : 'taken', suggestions: res.suggestions }))
        .catch(() => !cancelled && setResult({ for: username, status: 'error', suggestions: [] }));
    }, DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [username, seed]);

  useEffect(() => {
    if (!wantIdeas) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      AccountService.checkUsername('', seed)
        .then((res) => !cancelled && setIdeas({ for: seed, list: res.suggestions }))
        .catch(() => undefined);
    }, DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [wantIdeas, seed]);

  if (!isValidUsername(username)) {
    return { status: 'idle' as UsernameStatus, suggestions: wantIdeas && ideas?.for === seed ? ideas.list : [] };
  }
  if (result?.for !== username) return { status: 'checking' as UsernameStatus, suggestions: [] as string[] };
  return { status: result.status as UsernameStatus, suggestions: result.suggestions };
}

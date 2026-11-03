import { useEffect, useRef, useState } from 'react';
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
 * Debounced availability check, run only for what is typed in the username box. Stale responses are
 * dropped, and "checking" shows only while a request is out, not on every keystroke.
 * `suggest` is true while the box is focused: only then does `name` (before signup) fetch ideas to tap,
 * so typing the name itself never calls the server.
 */
export function useUsernameCheck(username: string, name = '', suggest = false) {
  const [result, setResult] = useState<UsernameCheck | null>(null);
  const [inFlight, setInFlight] = useState<string | null>(null);
  const [ideas, setIdeas] = useState<{ for: string; list: string[] } | null>(null);
  const seed = name.trim();
  const latestSeed = useRef(seed);
  const fetchIdeas = suggest && username.length === 0 && isValidName(seed);

  useEffect(() => {
    latestSeed.current = seed;
  }, [seed]);

  useEffect(() => {
    if (!isValidUsername(username)) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      setInFlight(username);
      AccountService.checkUsername(username, latestSeed.current)
        .then((res) => !cancelled && setResult({ for: username, status: res.available ? 'available' : 'taken', suggestions: res.suggestions }))
        .catch(() => !cancelled && setResult({ for: username, status: 'error', suggestions: [] }));
    }, DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [username]);

  useEffect(() => {
    if (!fetchIdeas || ideas?.for === seed) return;
    let cancelled = false;
    AccountService.checkUsername('', seed)
      .then((res) => !cancelled && setIdeas({ for: seed, list: res.suggestions }))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [fetchIdeas, seed, ideas?.for]);

  if (!isValidUsername(username)) {
    return { status: 'idle' as UsernameStatus, suggestions: username.length === 0 && ideas?.for === seed ? ideas.list : [] };
  }
  if (result?.for === username) return { status: result.status as UsernameStatus, suggestions: result.suggestions };
  return { status: (inFlight === username ? 'checking' : 'idle') as UsernameStatus, suggestions: [] as string[] };
}

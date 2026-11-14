import { useAuthStore } from '@/stores/auth-store';
import { useSupportPassStore } from '@/stores/support-pass-store';
import { supportRoutes } from '../lib/support';

/**
 * Who the help screens act for: the signed-in person, or (signed out, `hold`) an account on hold using the pass
 * its login gave. `token` is empty when neither is there.
 */
export function useSupportSession() {
  const signedIn = useAuthStore((s) => s.isAuthenticated);
  const session = useAuthStore((s) => s.token);
  const pass = useSupportPassStore((s) => s.pass);
  const hold = !signedIn;
  return { hold, token: (hold ? pass?.token : session) ?? '', routes: supportRoutes(hold) };
}

import { useAuthStore } from '@/stores/auth-store';

/** The signed-in user's JWT. Screens that call this sit behind AuthGuard, so it is always set there. */
export function useAuthToken() {
  return useAuthStore((s) => s.token) ?? '';
}

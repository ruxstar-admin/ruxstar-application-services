import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { useAuthToken } from '@/hooks/use-auth-token';
import { ApiError } from '@/lib/api-error';
import { AdminService } from '@/services/admin-service';
import type { Access, Permission } from '@/types/admin';

/** `'admin'` sections are for admins only; the rest need the permission named. */
export type Need = Permission | 'admin' | null;

export const allows = (access: Access, need: Need) => need === null || access.admin || (need !== 'admin' && access.permissions.includes(need));

type State = { access: Access } | { failed: 'ended' | 'offline' } | null;

const AccessContext = createContext<{ state: State; retry: () => void }>({ state: null, retry: () => undefined });

/** Loads what the signed-in admin or staff member may do, once for the whole console. */
export function AccessProvider({ children }: { children: ReactNode }) {
  const token = useAuthToken();
  const [state, setState] = useState<State>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let live = true;
    AdminService.getAccess(token).then(
      (access) => live && setState({ access }),
      (err) => live && setState({ failed: err instanceof ApiError && err.kind === 'forbidden' ? 'ended' : 'offline' }),
    );
    return () => {
      live = false;
    };
  }, [token, attempt]);

  const retry = useCallback(() => {
    setState(null);
    setAttempt((n) => n + 1);
  }, []);

  return <AccessContext.Provider value={{ state, retry }}>{children}</AccessContext.Provider>;
}

export const useAccessState = () => useContext(AccessContext);

/** Inside the console, once access has loaded (the tab layout waits for it). */
export function useAccess(): Access {
  const { state } = useContext(AccessContext);
  if (!state || !('access' in state)) throw new Error('useAccess before access loaded');
  return state.access;
}

export const useCan = (need: Need) => allows(useAccess(), need);

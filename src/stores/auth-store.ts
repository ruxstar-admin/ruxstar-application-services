import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type UserRole = 'customer' | 'vendor' | 'delivery';

export interface AuthState {
  token:       string | null;
  userId:      string | null;
  role:        UserRole | null;
  phone:       string | null;
  name:        string | null;
  isAuthenticated: boolean;
  isLoading:   boolean;

  /** True once AsyncStorage hydration is complete — guards premature redirects */
  _hasHydrated: boolean;

  /** In-memory only — vendors can browse the user/customer app without changing their role */
  activeMode: 'vendor' | 'user' | null;

  // Held in memory during registration flow — not persisted
  pendingPhone:       string | null;
  pendingSignupToken: string | null;

  setAuth:               (p: { token: string; userId: string; role: UserRole; phone: string; name?: string }) => void;
  clearAuth:             () => void;
  setLoading:            (v: boolean) => void;
  setPendingPhone:       (phone: string) => void;
  setPendingSignupToken: (token: string) => void;
  clearPending:          () => void;
  setHasHydrated:        (v: boolean) => void;
  setActiveMode:         (m: 'vendor' | 'user' | null) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token:           null,
      userId:          null,
      role:            null,
      phone:           null,
      name:            null,
      isAuthenticated: false,
      isLoading:       false,
      _hasHydrated:    false,
      activeMode:      null,
      pendingPhone:       null,
      pendingSignupToken: null,

      setAuth: ({ token, userId, role, phone, name }) =>
        set({ token, userId, role, phone, name: name ?? null, isAuthenticated: true, isLoading: false }),

      clearAuth: () =>
        set({ token: null, userId: null, role: null, phone: null, name: null, isAuthenticated: false }),

      setLoading: (v) => set({ isLoading: v }),

      setPendingPhone:       (phone) => set({ pendingPhone: phone }),
      setPendingSignupToken: (token) => set({ pendingSignupToken: token }),
      clearPending:          ()      => set({ pendingPhone: null, pendingSignupToken: null }),
      setHasHydrated:        (v)     => set({ _hasHydrated: v }),
      setActiveMode:         (m)     => set({ activeMode: m }),
    }),
    {
      name:    'ruxstar_auth',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        token:           state.token,
        userId:          state.userId,
        role:            state.role,
        phone:           state.phone,
        name:            state.name,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        // state can be undefined on storage error — use a direct setState fallback
        if (state) {
          state.setHasHydrated(true);
        } else {
          useAuthStore.getState().setHasHydrated(true);
        }
      },
    },
  ),
);

// Belt-and-suspenders: if onRehydrateStorage never fires (cold start with no storage),
// onFinishHydration ensures the flag is always set.
useAuthStore.persist.onFinishHydration(() => {
  if (!useAuthStore.getState()._hasHydrated) {
    useAuthStore.setState({ _hasHydrated: true });
  }
});

// ─── Post-login route hint ────────────────────────────────────────────────────
// Login / OTP screens set this BEFORE calling setAuth() so that AuthGuard
// performs exactly one navigation with no intermediate dashboard flash.
let _pendingLoginRoute: string | null = null;

export function setPendingLoginRoute(route: string) {
  _pendingLoginRoute = route;
}

export function consumePendingLoginRoute(): string | null {
  const r = _pendingLoginRoute;
  _pendingLoginRoute = null;
  return r;
}

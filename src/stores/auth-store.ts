import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { Role } from '@/constants/roles';
import type { AuthUser } from '@/types/auth';

interface AuthState {
  token: string | null;
  userId: string | null;
  /** Primary role from login (kept for display); `roles` is what authorises access. */
  role: Role | null;
  roles: Role[];
  mobile: string | null;
  name: string | null;
  isAuthenticated: boolean;
  /** Non-persisted: flips true once AsyncStorage rehydration finishes (see AuthGuard). */
  _hasHydrated: boolean;

  setAuth: (token: string, user: AuthUser) => void;
  clearAuth: () => void;
  setName: (name: string) => void;
  /** Adds a role granted after login (e.g. vendor KYC approval) without a fresh sign-in. */
  addRole: (role: Role) => void;
  setHasHydrated: (value: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      userId: null,
      role: null,
      roles: [],
      mobile: null,
      name: null,
      isAuthenticated: false,
      _hasHydrated: false,

      setAuth: (token, user) =>
        set({
          token,
          userId: user._id,
          role: user.roles[0] ?? null,
          roles: user.roles,
          mobile: user.mobile,
          name: user.name,
          isAuthenticated: true,
        }),

      clearAuth: () =>
        set({
          token: null,
          userId: null,
          role: null,
          roles: [],
          mobile: null,
          name: null,
          isAuthenticated: false,
        }),

      setName: (name) => set({ name }),

      addRole: (role) => set((state) => (state.roles.includes(role) ? state : { roles: [...state.roles, role] })),

      setHasHydrated: (value) => set({ _hasHydrated: value }),
    }),
    {
      name: 'ruxstar_auth',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        token: state.token,
        userId: state.userId,
        role: state.role,
        roles: state.roles,
        mobile: state.mobile,
        name: state.name,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => state?.setHasHydrated(true),
    },
  ),
);

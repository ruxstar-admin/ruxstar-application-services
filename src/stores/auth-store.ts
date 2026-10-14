import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { Role } from '@/constants/roles';
import type { AuthUser } from '@/types/auth';

interface AuthState {
  token: string | null;
  userId: string | null;
  role: Role | null;
  mobile: string | null;
  name: string | null;
  isAuthenticated: boolean;
  /** Non-persisted: flips true once AsyncStorage rehydration finishes (see AuthGuard). */
  _hasHydrated: boolean;

  setAuth: (token: string, user: AuthUser) => void;
  clearAuth: () => void;
  setHasHydrated: (value: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      userId: null,
      role: null,
      mobile: null,
      name: null,
      isAuthenticated: false,
      _hasHydrated: false,

      setAuth: (token, user) =>
        set({
          token,
          userId: user._id,
          role: user.roles[0] ?? null,
          mobile: user.mobile,
          name: user.name,
          isAuthenticated: true,
        }),

      clearAuth: () =>
        set({
          token: null,
          userId: null,
          role: null,
          mobile: null,
          name: null,
          isAuthenticated: false,
        }),

      setHasHydrated: (value) => set({ _hasHydrated: value }),
    }),
    {
      name: 'ruxstar_auth',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        token: state.token,
        userId: state.userId,
        role: state.role,
        mobile: state.mobile,
        name: state.name,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => state?.setHasHydrated(true),
    },
  ),
);

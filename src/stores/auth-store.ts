import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { rolesFrom, type Role } from '@/constants/roles';
import { secureStorage } from '@/lib/secure-storage';
import type { AuthTokens, AuthUser } from '@/types/auth';

/** Where sessions lived before tokens moved to the secure store. Holds an old-API token, so it is wiped. */
const LEGACY_KEY = 'ruxstar_auth';
AsyncStorage.removeItem(LEGACY_KEY).catch(() => undefined);

interface AuthState {
  /** Access token, 15 minutes. The API client swaps it using `refreshToken` when it expires. */
  token: string | null;
  refreshToken: string | null;
  userId: string | null;
  /** Roles on top of User. Authorises the vendor portal and the delivery area. */
  roles: Role[];
  /** 10 digits, without +91. */
  mobile: string | null;
  name: string | null;
  isAuthenticated: boolean;
  /** Non-persisted: flips true once secure-store rehydration finishes (see AuthGuard). */
  _hasHydrated: boolean;

  setAuth: (tokens: AuthTokens, user: AuthUser) => void;
  setTokens: (tokens: AuthTokens) => void;
  clearAuth: () => void;
  setName: (name: string) => void;
  /** Adds a role granted after login (e.g. vendor KYC approval) without a fresh sign-in. */
  addRole: (role: Role) => void;
  setHasHydrated: (value: boolean) => void;
}

const identity = (user: AuthUser) => ({
  userId: user.id,
  roles: rolesFrom(user.roles),
  mobile: user.phone.replace(/^\+91/, ''),
  name: user.name,
});

const SIGNED_OUT = {
  token: null,
  refreshToken: null,
  userId: null,
  roles: [],
  mobile: null,
  name: null,
  isAuthenticated: false,
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      ...SIGNED_OUT,
      _hasHydrated: false,

      setAuth: (tokens, user) =>
        set({ token: tokens.accessToken, refreshToken: tokens.refreshToken, ...identity(user), isAuthenticated: true }),

      setTokens: (tokens) => set({ token: tokens.accessToken, refreshToken: tokens.refreshToken }),

      clearAuth: () => set(SIGNED_OUT),

      setName: (name) => set({ name }),

      addRole: (role) => set((state) => (state.roles.includes(role) ? state : { roles: [...state.roles, role] })),

      setHasHydrated: (value) => set({ _hasHydrated: value }),
    }),
    {
      name: 'ruxstar_session',
      storage: createJSONStorage(() => secureStorage),
      partialize: (state) => ({
        token: state.token,
        refreshToken: state.refreshToken,
        userId: state.userId,
        roles: state.roles,
        mobile: state.mobile,
        name: state.name,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => state?.setHasHydrated(true),
    },
  ),
);

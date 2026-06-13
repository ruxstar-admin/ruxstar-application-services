import { create } from 'zustand';

export type UserRole = 'customer' | 'vendor' | 'delivery';

export interface AuthState {
  token:       string | null;
  userId:      string | null;
  role:        UserRole | null;
  phone:       string | null;
  name:        string | null;
  isAuthenticated: boolean;
  isLoading:   boolean;

  // Held in memory during registration flow
  pendingPhone:       string | null;
  pendingSignupToken: string | null;

  setAuth:            (p: { token: string; userId: string; role: UserRole; phone: string; name?: string }) => void;
  clearAuth:          () => void;
  setLoading:         (v: boolean) => void;
  setPendingPhone:    (phone: string) => void;
  setPendingSignupToken: (token: string) => void;
  clearPending:       () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token:       null,
  userId:      null,
  role:        null,
  phone:       null,
  name:        null,
  isAuthenticated: false,
  isLoading:   false,
  pendingPhone:       null,
  pendingSignupToken: null,

  setAuth: ({ token, userId, role, phone, name }) =>
    set({ token, userId, role, phone, name: name ?? null, isAuthenticated: true, isLoading: false }),

  clearAuth: () =>
    set({ token: null, userId: null, role: null, phone: null, name: null, isAuthenticated: false }),

  setLoading: (v) => set({ isLoading: v }),

  setPendingPhone: (phone) => set({ pendingPhone: phone }),

  setPendingSignupToken: (token) => set({ pendingSignupToken: token }),

  clearPending: () => set({ pendingPhone: null, pendingSignupToken: null }),
}));

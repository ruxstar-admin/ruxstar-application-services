/**
 * UserStore — Zustand store for the logged-in user's profile data.
 *
 * Separate from AuthStore (which owns tokens / auth state).
 * This store holds the human-readable profile fetched after login.
 */

import { create } from 'zustand';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface UserProfile {
  id: string;
  name: string;
  phone: string;
  countryCode: string;
  email?: string;
  avatarUrl?: string;
  dateOfBirth?: string;
  createdAt: string;
  updatedAt: string;
}

export interface VendorProfile {
  businessName: string;
  businessCategory: string;
  gstNumber?: string;
  logoUrl?: string;
  bannerUrl?: string;
  isVerified: boolean;
  rating: number;           // 0–5
  totalReviews: number;
  totalOrders: number;
  joinedAt: string;
}

// ─── Store interface ──────────────────────────────────────────────────────────

interface UserState {
  /** Core user profile — null until loaded */
  profile: UserProfile | null;
  /** Vendor-specific data — null for regular users */
  vendorProfile: VendorProfile | null;
  /** true once the first profile fetch completes */
  isProfileLoaded: boolean;
  /** true while a profile fetch is in-flight */
  isFetching: boolean;

  // ── Actions ────────────────────────────────────────────────────────────────
  setProfile: (profile: UserProfile) => void;
  setVendorProfile: (vendor: VendorProfile) => void;
  /** Merge partial updates into the profile (e.g. after edit) */
  updateProfile: (partial: Partial<UserProfile>) => void;
  /** Merge partial updates into vendor profile */
  updateVendorProfile: (partial: Partial<VendorProfile>) => void;
  setFetching: (fetching: boolean) => void;
  /** Wipe profile on logout */
  clearProfile: () => void;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useUserStore = create<UserState>((set) => ({
  profile: null,
  vendorProfile: null,
  isProfileLoaded: false,
  isFetching: false,

  setProfile: (profile) =>
    set({ profile, isProfileLoaded: true, isFetching: false }),

  setVendorProfile: (vendorProfile) => set({ vendorProfile }),

  updateProfile: (partial) =>
    set((state) =>
      state.profile
        ? { profile: { ...state.profile, ...partial } }
        : {},
    ),

  updateVendorProfile: (partial) =>
    set((state) =>
      state.vendorProfile
        ? { vendorProfile: { ...state.vendorProfile, ...partial } }
        : {},
    ),

  setFetching: (isFetching) => set({ isFetching }),

  clearProfile: () =>
    set({
      profile: null,
      vendorProfile: null,
      isProfileLoaded: false,
      isFetching: false,
    }),
}));

/**
 * Business Store (Zustand)
 * Calls backend API — no more AsyncStorage for business data.
 * Uses vendor-business-service for all CRUD.
 */

import { create } from 'zustand';
import {
  listVendorBusinesses,
  createVendorBusiness,
  deleteVendorBusiness,
  updateBusinessStatus as apiUpdateBusinessStatus,
  updateVendorBusiness,
  type Business,
  type BusinessInput,
  type BusinessProfilePatch,
} from '@/services/vendor-business-service';

// ─── Store interface ──────────────────────────────────────────────────────────

interface BusinessState {
  businesses:  Business[];
  loading:     boolean;
  removingId:  string | null;
  error:       string | null;

  loadBusinesses:       (token: string) => Promise<void>;
  addBusiness:          (token: string, input: BusinessInput) => Promise<Business>;
  removeBusiness:       (token: string, id: string) => Promise<void>;
  updateBusinessStatus: (token: string, id: string, status: 'live' | 'draft') => Promise<Business>;
  updateBusiness:       (token: string, id: string, patch: BusinessProfilePatch) => Promise<Business>;

  clearError: () => void;
  reset:      () => void;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useBusinessStore = create<BusinessState>((set, get) => ({
  businesses:  [],
  loading:     false,
  removingId:  null,
  error:       null,

  loadBusinesses: async (token) => {
    set({ loading: true, error: null });
    try {
      const businesses = await listVendorBusinesses(token);
      set({ businesses, loading: false });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load businesses.';
      set({ error: msg, loading: false });
    }
  },

  addBusiness: async (token, input) => {
    const created = await createVendorBusiness(token, input);
    set({ businesses: [created, ...get().businesses] });
    return created;
  },

  removeBusiness: async (token, id) => {
    set({ removingId: id });
    try {
      await deleteVendorBusiness(token, id);
      set({ businesses: get().businesses.filter((b) => b.id !== id), removingId: null });
    } catch (err) {
      set({ removingId: null });
      throw err;
    }
  },

  updateBusinessStatus: async (token, id, status) => {
    const updated = await apiUpdateBusinessStatus(token, id, status);
    set({ businesses: get().businesses.map((b) => b.id === id ? updated : b) });
    return updated;
  },

  updateBusiness: async (token, id, patch) => {
    const updated = await updateVendorBusiness(token, id, patch);
    set({ businesses: get().businesses.map((b) => b.id === id ? updated : b) });
    return updated;
  },

  clearError: () => set({ error: null }),

  reset: () => set({ businesses: [], loading: false, removingId: null, error: null }),
}));

/**
 * Business Store (Zustand + AsyncStorage)
 * ----------------------------------------
 * Mirrors the web's lib/vendor-businesses.ts localStorage logic,
 * adapted to React Native AsyncStorage.
 * Key pattern: ruxstar_vendor_businesses_<userId>
 */

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { VendorBusiness, BusinessFormData } from '@/types/vendor';

// ─── Storage helpers ──────────────────────────────────────────────────────────

function storageKey(userId: string) {
  return `ruxstar_vendor_businesses_${userId}`;
}

async function loadFromStorage(userId: string): Promise<VendorBusiness[]> {
  try {
    const raw = await AsyncStorage.getItem(storageKey(userId));
    if (!raw) return [];
    return JSON.parse(raw) as VendorBusiness[];
  } catch {
    return [];
  }
}

async function saveToStorage(userId: string, list: VendorBusiness[]): Promise<void> {
  try {
    await AsyncStorage.setItem(storageKey(userId), JSON.stringify(list));
  } catch {
    // Silently ignore storage write failures
  }
}

// ─── Store interface ──────────────────────────────────────────────────────────

interface BusinessState {
  businesses: VendorBusiness[];
  loading:    boolean;
  error:      string | null;

  /** Load businesses for the given userId from AsyncStorage */
  loadBusinesses: (userId: string) => Promise<void>;

  /** Add a new business entry; persists to AsyncStorage */
  addBusiness: (userId: string, form: BusinessFormData) => Promise<void>;

  /** Remove a business by id; persists to AsyncStorage */
  removeBusiness: (userId: string, id: string) => Promise<void>;

  clearError: () => void;
  reset:      () => void;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useBusinessStore = create<BusinessState>((set, get) => ({
  businesses: [],
  loading:    false,
  error:      null,

  loadBusinesses: async (userId) => {
    set({ loading: true, error: null });
    try {
      const businesses = await loadFromStorage(userId);
      set({ businesses, loading: false });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load businesses.';
      set({ error: msg, loading: false });
    }
  },

  addBusiness: async (userId, form) => {
    const newEntry: VendorBusiness = {
      id:          Math.random().toString(36).slice(2) + Date.now().toString(36),
      name:        form.name.trim(),
      category:    form.category,
      phone:       form.phone.trim(),
      address:     form.address.trim(),
      description: form.description.trim(),
      createdAt:   new Date().toISOString(),
    };

    const updated = [newEntry, ...get().businesses];
    set({ businesses: updated });
    await saveToStorage(userId, updated);
  },

  removeBusiness: async (userId, id) => {
    const updated = get().businesses.filter((b) => b.id !== id);
    set({ businesses: updated });
    await saveToStorage(userId, updated);
  },

  clearError: () => set({ error: null }),

  reset: () => set({ businesses: [], loading: false, error: null }),
}));

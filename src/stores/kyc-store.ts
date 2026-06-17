import { create } from 'zustand';
import { KycService, normalizeVendorKycStatus, nextKycStep } from '@/services/kyc-service';
import type { VendorKycStatus, KycOverallStatus } from '@/services/kyc-service';

export type { KycOverallStatus };

interface KycState {
  status:    VendorKycStatus | null;
  loading:   boolean;
  error:     string | null;

  /** Fetch current KYC status from backend */
  fetchStatus: (token: string) => Promise<VendorKycStatus>;

  /** Poll until overall status matches one of the target values (or timeout) */
  pollUntil: (
    token: string,
    targets: KycOverallStatus[],
    opts?: { intervalMs?: number; maxAttempts?: number },
  ) => Promise<VendorKycStatus>;

  clearError: () => void;
  reset:      () => void;
}

export const useKycStore = create<KycState>((set, get) => ({
  status:  null,
  loading: false,
  error:   null,

  fetchStatus: async (token) => {
    set({ loading: true, error: null });
    try {
      const status = await KycService.getStatus(token);
      set({ status, loading: false });
      return status;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch KYC status.';
      set({ error: msg, loading: false });
      throw err;
    }
  },

  pollUntil: async (token, targets, opts = {}) => {
    const { intervalMs = 3000, maxAttempts = 20 } = opts;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const status = await get().fetchStatus(token);
      if (targets.includes(status.status)) return status;

      // Back off if we're not at the last attempt
      if (attempt < maxAttempts - 1) {
        await new Promise<void>((r) => setTimeout(r, intervalMs));
      }
    }

    // Return whatever we have after exhausting attempts
    return get().status ?? normalizeVendorKycStatus(null);
  },

  clearError: () => set({ error: null }),

  reset: () => set({ status: null, loading: false, error: null }),
}));

// Re-export helper so screens can import from one place
export { nextKycStep };

import { create } from 'zustand';
import type { SupportPass } from '@/types/support';

interface SupportPassState {
  /** Held in memory only: it opens nothing but help tickets, and logging in again gives a fresh one. */
  pass: SupportPass | null;
  setPass: (pass: SupportPass) => void;
  clearPass: () => void;
}

/** The support pass from a login refused because the account is on hold. */
export const useSupportPassStore = create<SupportPassState>((set) => ({
  pass: null,
  setPass: (pass) => set({ pass }),
  clearPass: () => set({ pass: null }),
}));

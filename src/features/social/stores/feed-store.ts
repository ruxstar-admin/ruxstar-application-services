import { create } from 'zustand';

interface FeedState {
  /** Set when a post was created, edited or deleted elsewhere, so the feed refreshes when it regains focus. */
  dirty: boolean;
  /** Goes up on every such change, so profile post lists can reload too. */
  version: number;
  markDirty: () => void;
  clearDirty: () => void;
}

export const useFeedStore = create<FeedState>((set) => ({
  dirty: false,
  version: 0,
  markDirty: () => set((s) => ({ dirty: true, version: s.version + 1 })),
  clearDirty: () => set({ dirty: false }),
}));

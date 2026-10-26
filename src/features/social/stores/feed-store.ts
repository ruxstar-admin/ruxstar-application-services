import { create } from 'zustand';

interface FeedState {
  /** Set when a post was created, edited or deleted elsewhere, so the feed refreshes when it regains focus. */
  dirty: boolean;
  markDirty: () => void;
  clearDirty: () => void;
}

export const useFeedStore = create<FeedState>((set) => ({
  dirty: false,
  markDirty: () => set({ dirty: true }),
  clearDirty: () => set({ dirty: false }),
}));

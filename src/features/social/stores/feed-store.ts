import { useMemo } from 'react';
import { create } from 'zustand';
import type { Post } from '@/types/social';

interface PostEdit {
  changes: Partial<Post>;
  /** When it was made (ms). A list loaded after it already has it from the server. */
  at: number;
}

interface FeedState {
  /** Set when who you see changed (a follow, block or unblock), so the feed reloads when it regains focus. */
  dirty: boolean;
  /** Goes up whenever your posts change, so profile post grids reload too. */
  version: number;
  /** A post you just made, for the feed to put on top when it is shown again. */
  posted: Post | null;
  /** The latest change made on this phone to each post (likes, saves, comment counts, text), for every list showing it. */
  edits: Record<string, PostEdit>;
  /** Posts deleted on this phone. */
  gone: Record<string, true>;
  markDirty: () => void;
  clearDirty: () => void;
  addPost: (post: Post) => void;
  takePosted: () => Post | null;
  editPost: (id: string, changes: Partial<Post>) => void;
  removePost: (id: string) => void;
}

export const useFeedStore = create<FeedState>((set, get) => ({
  dirty: false,
  version: 0,
  posted: null,
  edits: {},
  gone: {},
  markDirty: () => set((s) => ({ dirty: true, version: s.version + 1 })),
  clearDirty: () => set({ dirty: false }),
  addPost: (post) => set((s) => ({ posted: post, version: s.version + 1 })),
  takePosted: () => {
    const { posted } = get();
    if (posted) set({ posted: null });
    return posted;
  },
  editPost: (id, changes) =>
    set((s) => ({
      edits: { ...s.edits, [id]: { changes: { ...s.edits[id]?.changes, ...changes }, at: Date.now() } },
      version: 'text' in changes ? s.version + 1 : s.version,
    })),
  removePost: (id) => set((s) => ({ gone: { ...s.gone, [id]: true }, version: s.version + 1 })),
}));

/** Applies this phone's newer changes to posts a list loaded at `loadedAt`, and drops deleted ones. Unchanged posts keep their object. */
export function applyEdits(posts: Post[], loadedAt: number, edits: Record<string, PostEdit>, gone: Record<string, true>): Post[] {
  return posts.flatMap((post) => {
    if (gone[post.id]) return [];
    const edit = edits[post.id];
    return [edit && edit.at > loadedAt ? { ...post, ...edit.changes } : post];
  });
}

export function useLatestPosts(posts: Post[], loadedAt: number): Post[] {
  const edits = useFeedStore((s) => s.edits);
  const gone = useFeedStore((s) => s.gone);
  return useMemo(() => applyEdits(posts, loadedAt, edits, gone), [posts, loadedAt, edits, gone]);
}

export function useLatestPost(post: Post | undefined, loadedAt: number): Post | undefined {
  const [latest] = useLatestPosts(useMemo(() => (post ? [post] : []), [post]), loadedAt);
  return latest;
}

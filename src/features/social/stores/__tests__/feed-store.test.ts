import { applyEdits, useFeedStore } from '../feed-store';
import type { Post } from '@/types/social';

const post = (id: string, likes = 0): Post => ({
  id,
  author: { id: 'u1', name: 'Asha', username: 'asha', isVendor: false, verified: false },
  kind: 'personal',
  business: null,
  text: 'Hello',
  photos: [],
  likes,
  comments: 0,
  createdAt: '2026-11-14T08:00:00.000Z',
  editedAt: null,
  likedByMe: false,
  savedByMe: false,
  mine: false,
});

describe('feed store', () => {
  beforeEach(() => useFeedStore.setState({ edits: {}, gone: {}, posted: null, version: 0 }));

  it('shows changes made after a list loaded, not before, and drops deleted posts', () => {
    const a = post('a', 3);
    const b = post('b');
    const c = post('c');
    const edits = { a: { changes: { likes: 4, likedByMe: true }, at: 200 }, b: { changes: { comments: 9 }, at: 50 } };
    const shown = applyEdits([a, b, c], 100, edits, { c: true });
    expect(shown).toEqual([{ ...a, likes: 4, likedByMe: true }, b]);
    expect(shown[1]).toBe(b);
  });

  it('merges a post’s changes and hands a new post to the feed once', () => {
    const { editPost, addPost, takePosted } = useFeedStore.getState();
    editPost('a', { likes: 1, likedByMe: true });
    editPost('a', { comments: 2 });
    expect(useFeedStore.getState().edits.a?.changes).toEqual({ likes: 1, likedByMe: true, comments: 2 });
    expect(useFeedStore.getState().version).toBe(0);
    editPost('a', { text: 'Changed', editedAt: '2026-11-14T09:00:00.000Z' });
    expect(useFeedStore.getState().version).toBe(1);

    addPost(post('new'));
    expect(takePosted()?.id).toBe('new');
    expect(takePosted()).toBeNull();
  });
});

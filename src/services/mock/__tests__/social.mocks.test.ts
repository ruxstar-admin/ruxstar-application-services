import { findMock, runMock } from '..';
import type { Page, Post, SearchResult } from '@/types/social';

const call = <T = unknown>(path: string, body?: Record<string, unknown>) => {
  const route = findMock('POST', path, 'auto');
  if (!route) throw new Error(`no mock for ${path}`);
  return runMock({ ...route, latencyMs: 0 }, { path, body }) as Promise<T>;
};

describe('feed', () => {
  it('pages through every post exactly once', async () => {
    const seen = new Set<string>();
    let cursor: string | undefined;
    let pages = 0;
    do {
      const page: Page<Post> = await call('/feed/list', { cursor });
      page.items.forEach((p) => seen.add(p.id));
      cursor = page.nextCursor ?? undefined;
      pages += 1;
    } while (cursor);
    expect(pages).toBe(5);
    expect(seen.size).toBe(45);
  });

  it('keeps like counts consistent when liking twice', async () => {
    const first = await call<{ likes: number }>('/posts/like', { id: 'p2', liked: true });
    const again = await call<{ likes: number }>('/posts/like', { id: 'p2', liked: true });
    expect(again.likes).toBe(first.likes);
    const undone = await call<{ likes: number; likedByMe: boolean }>('/posts/like', { id: 'p2', liked: false });
    expect(undone).toEqual({ likes: first.likes - 1, likedByMe: false });
  });
});

describe('posts', () => {
  it('lets you edit and delete your own post but not someone else’s', async () => {
    const created = await call<Post>('/posts/create', { text: 'hello', images: [] });
    expect(created.mine).toBe(true);

    await expect(call('/posts/update', { id: created.id, text: 'edited' })).resolves.toMatchObject({ text: 'edited' });
    await call('/posts/delete', { id: created.id });
    await expect(call('/posts/get', { id: created.id })).rejects.toMatchObject({ kind: 'not_found' });

    await expect(call('/posts/delete', { id: 'p3' })).rejects.toMatchObject({ kind: 'forbidden' });
  });

  it('adds a comment and counts it', async () => {
    const before = await call<Post>('/posts/get', { id: 'p4' });
    const comment = await call<{ text: string }>('/posts/comment', { id: 'p4', text: 'nice' });
    const after = await call<Post>('/posts/get', { id: 'p4' });
    expect(comment.text).toBe('nice');
    expect(after.comments).toBe(before.comments + 1);
  });
});

describe('search', () => {
  it('needs two characters and filters by scope', async () => {
    await expect(call('/search', { q: 'p', scope: 'people' })).resolves.toEqual([]);
    const people = await call<SearchResult[]>('/search', { q: 'priya', scope: 'people' });
    expect(people.map((r) => r.id)).toEqual(['priya-nair']);
    await expect(call('/search', { q: 'priya', scope: 'events' })).resolves.toEqual([]);
  });
});

describe('notifications', () => {
  it('counts unread, then answers an offer only once', async () => {
    const { count } = await call<{ count: number }>('/notifications/unread-count');
    expect(count).toBeGreaterThan(0);

    await expect(call('/notifications/respond', { id: 'n1', accept: true })).resolves.toEqual({ message: 'Accepted' });
    await expect(call('/notifications/respond', { id: 'n1', accept: true })).rejects.toMatchObject({ kind: 'not_found' });

    await call('/notifications/read', {});
    await expect(call('/notifications/unread-count')).resolves.toEqual({ count: 0 });
  });
});

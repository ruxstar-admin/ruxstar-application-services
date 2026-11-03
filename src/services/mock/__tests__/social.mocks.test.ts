import { findMock, runMock } from '..';
import type { SearchResult } from '@/types/social';

const call = <T = unknown>(path: string, body?: Record<string, unknown>) => {
  const route = findMock('POST', path, 'auto');
  if (!route) throw new Error(`no mock for ${path}`);
  return runMock({ ...route, latencyMs: 0 }, { path, body }) as Promise<T>;
};

describe('search', () => {
  it('needs two characters and filters by scope', async () => {
    await expect(call('/search', { q: 'c', scope: 'businesses' })).resolves.toEqual([]);
    const shops = await call<SearchResult[]>('/search', { q: 'clay', scope: 'businesses' });
    expect(shops.map((r) => r.id)).toEqual(['b2']);
    await expect(call('/search', { q: 'clay', scope: 'events' })).resolves.toEqual([]);
  });
});

describe('real social endpoints', () => {
  it('are no longer mocked', () => {
    for (const path of ['/feed/list', '/posts/create', '/posts/like', '/notifications/list', '/notifications/read']) {
      expect(findMock('POST', path, 'auto')).toBeUndefined();
    }
  });
});

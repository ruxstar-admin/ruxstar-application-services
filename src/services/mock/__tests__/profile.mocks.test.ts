import { findMock, runMock } from '..';
import type { HttpMethod } from '..';

const call = (method: HttpMethod, path: string, body?: Record<string, unknown>) => {
  const route = findMock(method, path, 'auto');
  if (!route) throw new Error(`no mock for ${method} ${path}`);
  return runMock({ ...route, latencyMs: 0 }, { path, body });
};

describe('profile mocks', () => {
  it('persists profile edits across reads', async () => {
    await call('POST', '/profile/update', { bio: 'New bio' });
    await expect(call('GET', '/profile/me')).resolves.toMatchObject({ bio: 'New bio' });
  });

  it('returns another user, or 404 for an unknown one', async () => {
    await expect(call('POST', '/users/profile', { userId: 'priya-nair' })).resolves.toMatchObject({ name: 'Priya Nair' });
    await expect(call('POST', '/users/profile', { userId: 'nobody' })).rejects.toMatchObject({ kind: 'not_found' });
  });

  it('keeps the current session when asked to end it', async () => {
    await call('POST', '/profile/sessions/revoke', { id: 's2' });
    await call('POST', '/profile/sessions/revoke', { id: 's1' });
    const sessions = (await call('GET', '/profile/sessions')) as { id: string }[];
    expect(sessions.map((s) => s.id)).toEqual(['s1', 's3']);
  });

  it('merges notification preference changes', async () => {
    await call('POST', '/settings/notifications', { digest: true });
    await expect(call('GET', '/settings/notifications')).resolves.toMatchObject({ digest: true, orders: true });
  });

  it('blocks then unblocks a user', async () => {
    await call('POST', '/users/block', { userId: 'u-new', name: 'New Person', username: 'new.p' });
    let list = (await call('GET', '/settings/blocked')) as { id: string }[];
    expect(list.some((u) => u.id === 'u-new')).toBe(true);
    await call('POST', '/users/unblock', { userId: 'u-new' });
    list = (await call('GET', '/settings/blocked')) as { id: string }[];
    expect(list.some((u) => u.id === 'u-new')).toBe(false);
  });
});

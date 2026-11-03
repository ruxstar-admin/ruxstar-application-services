import { findMock, runMock } from '..';
import type { HttpMethod } from '..';

const call = (method: HttpMethod, path: string, body?: Record<string, unknown>) => {
  const route = findMock(method, path, 'auto');
  if (!route) throw new Error(`no mock for ${method} ${path}`);
  return runMock({ ...route, latencyMs: 0 }, { path, body });
};

describe('profile mocks', () => {
  it('serves only the sample author; everyone else goes to the real API', async () => {
    await expect(call('GET', '/v1/account/profiles/priya-nair')).resolves.toMatchObject({ name: 'Priya Nair', badges: { vendor: true } });
    expect(findMock('GET', '/v1/account/profiles/asha.rao', 'auto')).toBeUndefined();
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

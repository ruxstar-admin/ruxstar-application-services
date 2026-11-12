import { findMock, runMock } from '..';
import type { HttpMethod } from '..';

const call = (method: HttpMethod, path: string, body?: Record<string, unknown>) => {
  const route = findMock(method, path, 'auto');
  if (!route) throw new Error(`no mock for ${method} ${path}`);
  return runMock({ ...route, latencyMs: 0 }, { path, body });
};

describe('profile mocks', () => {
  it('never answers for real profiles', () => {
    expect(findMock('GET', '/v1/account/profiles/priya-nair', 'auto')).toBeUndefined();
    expect(findMock('GET', '/v1/account/profiles/asha.rao', 'auto')).toBeUndefined();
  });

  it('merges notification preference changes', async () => {
    await call('POST', '/settings/notifications', { digest: true });
    await expect(call('GET', '/settings/notifications')).resolves.toMatchObject({ digest: true, orders: true });
  });

  it('leaves blocking and reporting people to the API', () => {
    expect(findMock('PUT', '/v1/social/users/asha.rao/block', 'auto')).toBeUndefined();
    expect(findMock('POST', '/users/block', 'auto')).toBeUndefined();
  });
});

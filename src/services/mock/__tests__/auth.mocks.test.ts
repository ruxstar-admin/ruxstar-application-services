import { findMock, runMock } from '..';

const call = (path: string, body: Record<string, unknown>) => {
  const route = findMock('POST', path, 'auto');
  if (!route) throw new Error(`no mock for ${path}`);
  return runMock({ ...route, latencyMs: 0 }, { path, body });
};

describe('forgot-password mocks', () => {
  it('verifies the code then resets once, and refuses to reuse a recent password', async () => {
    const { resetToken } = (await call('/auth/forgot-password/verify-otp', { mobile: '9000000001', otp: '123456' })) as {
      resetToken: string;
    };

    await expect(call('/auth/forgot-password/reset', { resetToken, password: 'first-pass' })).resolves.toEqual({
      message: 'Password updated',
    });
    await expect(call('/auth/forgot-password/reset', { resetToken, password: 'first-pass' })).rejects.toMatchObject({
      kind: 'conflict',
    });
  });

  it('rejects the demo wrong code and locks out after five attempts', async () => {
    await expect(call('/auth/forgot-password/verify-otp', { mobile: '9000000002', otp: '000000' })).rejects.toMatchObject({
      kind: 'unauthorized',
    });
    for (let i = 0; i < 4; i += 1) {
      await call('/auth/forgot-password/verify-otp', { mobile: '9000000003', otp: '000000' }).catch(() => undefined);
    }
    await call('/auth/forgot-password/verify-otp', { mobile: '9000000003', otp: '000000' }).catch(() => undefined);
    await expect(call('/auth/forgot-password/verify-otp', { mobile: '9000000003', otp: '123456' })).rejects.toMatchObject({
      kind: 'rate_limited',
    });
  });

  it('rejects an expired reset session', async () => {
    await expect(call('/auth/forgot-password/reset', { resetToken: 'nope', password: 'whatever' })).rejects.toMatchObject({
      kind: 'unauthorized',
    });
  });
});

describe('username mocks', () => {
  it('reports taken names with suggestions and free names as available', async () => {
    await expect(call('/account/username/check', { username: 'ruxstar' })).resolves.toMatchObject({ available: false });
    await expect(call('/account/username/check', { username: 'fresh.name' })).resolves.toEqual({
      available: true,
      suggestions: [],
    });
  });
});

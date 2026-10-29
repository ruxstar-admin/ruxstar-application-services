import { findMock, runMock } from '..';
import type { HttpMethod } from '..';

const call = (method: HttpMethod, path: string, body?: Record<string, unknown>) => {
  const route = findMock(method, path, 'auto');
  if (!route) throw new Error(`no mock for ${method} ${path}`);
  return runMock({ ...route, latencyMs: 0 }, { path, body });
};

describe('kyc mocks', () => {
  afterEach(() => jest.restoreAllMocks());

  it('rejects the demo wrong Aadhaar code', async () => {
    await expect(call('POST', '/kyc/aadhaar/verify-otp', { aadhaar: '234567890123', otp: '000000' })).rejects.toMatchObject({
      kind: 'unauthorized',
    });
    await expect(call('POST', '/kyc/aadhaar/verify-otp', { aadhaar: '234567890123', otp: '123456' })).resolves.toEqual({ ok: true });
  });

  it('refuses a bank account the penny-drop cannot verify', async () => {
    await expect(call('POST', '/kyc/bank', { accountNumber: '123456780000', ifsc: 'HDFC0001234' })).rejects.toMatchObject({
      kind: 'validation',
    });
    await expect(call('POST', '/kyc/bank', { accountNumber: '123456785678', ifsc: 'HDFC0001234' })).resolves.toMatchObject({
      last4: '5678',
    });
  });

  it('moves a submitted flow from pending to verified', async () => {
    const now = Date.now();
    const clock = jest.spyOn(Date, 'now').mockReturnValue(now);

    await expect(call('GET', '/kyc/status')).resolves.toMatchObject({ vendor: { status: 'not_started' } });
    await call('POST', '/kyc/submit', { flow: 'vendor' });
    await expect(call('GET', '/kyc/status')).resolves.toMatchObject({ vendor: { status: 'pending_review' } });

    clock.mockReturnValue(now + 7000);
    await expect(call('GET', '/kyc/status')).resolves.toMatchObject({ vendor: { status: 'verified' } });
  });
});

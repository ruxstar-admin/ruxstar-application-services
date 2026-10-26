import { ApiError } from '@/lib/api-error';
import { defineMocks, findMock, runMock } from '../registry';

defineMocks({
  'POST /test/missing-endpoint': { mocked: true, handle: () => ({ ok: true }), latencyMs: 0 },
  'POST /test/shipped-endpoint': { mocked: false, handle: () => ({ ok: true }), latencyMs: 0 },
  'POST /test/fails': {
    mocked: true,
    latencyMs: 0,
    handle: () => {
      throw new ApiError(409, 'taken');
    },
  },
});

describe('findMock', () => {
  it('auto mode mocks only routes flagged as mocked', () => {
    expect(findMock('POST', '/test/missing-endpoint', 'auto')).toBeDefined();
    expect(findMock('POST', '/test/shipped-endpoint', 'auto')).toBeUndefined();
  });

  it('all mode mocks every registered route, off mode none', () => {
    expect(findMock('POST', '/test/shipped-endpoint', 'all')).toBeDefined();
    expect(findMock('POST', '/test/missing-endpoint', 'off')).toBeUndefined();
  });

  it('never mocks a route that has no mock, or a different method', () => {
    expect(findMock('POST', '/test/unknown', 'all')).toBeUndefined();
    expect(findMock('GET', '/test/missing-endpoint', 'all')).toBeUndefined();
  });
});

describe('runMock', () => {
  it('returns the handler response', async () => {
    const route = findMock('POST', '/test/missing-endpoint', 'auto')!;
    await expect(runMock(route, { path: '/test/missing-endpoint' })).resolves.toEqual({ ok: true });
  });

  it('propagates ApiError so screens see the same errors as the real API', async () => {
    const route = findMock('POST', '/test/fails', 'auto')!;
    await expect(runMock(route, { path: '/test/fails' })).rejects.toMatchObject({ status: 409, kind: 'conflict' });
  });
});

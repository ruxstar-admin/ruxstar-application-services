import { ApiError } from '../api-error';

describe('ApiError kind', () => {
  it.each([
    [400, 'validation'],
    [401, 'unauthorized'],
    [403, 'forbidden'],
    [404, 'not_found'],
    [409, 'conflict'],
    [429, 'rate_limited'],
    [500, 'server'],
    [503, 'server'],
    [418, 'unknown'],
  ])('maps status %i to %s', (status, kind) => {
    expect(new ApiError(status, 'x').kind).toBe(kind);
  });

  it('builds network and timeout errors with status 0', () => {
    expect(ApiError.network()).toMatchObject({ status: 0, kind: 'network' });
    expect(ApiError.timeout()).toMatchObject({ status: 0, kind: 'timeout' });
  });
});

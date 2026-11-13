import { findMock } from '..';

describe('real social endpoints', () => {
  it('are no longer mocked', () => {
    for (const path of ['/search', '/notifications/respond', '/feed/list', '/posts/create', '/posts/like', '/notifications/list', '/notifications/read']) {
      expect(findMock('POST', path, 'auto')).toBeUndefined();
    }
  });
});

import { findMock } from '..';

describe('profile mocks', () => {
  it('never answers for real profiles', () => {
    expect(findMock('GET', '/v1/account/profiles/priya-nair', 'auto')).toBeUndefined();
    expect(findMock('GET', '/v1/account/profiles/asha.rao', 'auto')).toBeUndefined();
  });

  it('leaves blocking and reporting people to the API', () => {
    expect(findMock('PUT', '/v1/social/users/asha.rao/block', 'auto')).toBeUndefined();
    expect(findMock('POST', '/users/block', 'auto')).toBeUndefined();
  });
});

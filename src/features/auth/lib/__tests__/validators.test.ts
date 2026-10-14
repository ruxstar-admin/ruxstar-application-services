import { isValidMobile, mobileError, passwordError } from '../validators';

describe('isValidMobile', () => {
  it.each(['9876543210', '6000000000', '7123456789'])('accepts %s', (mobile) => {
    expect(isValidMobile(mobile)).toBe(true);
  });

  it.each(['', '123456789', '98765432100', '5876543210', '98765abcde'])('rejects "%s"', (mobile) => {
    expect(isValidMobile(mobile)).toBe(false);
  });
});

describe('mobileError', () => {
  it('stays quiet while empty or valid', () => {
    expect(mobileError('')).toBeNull();
    expect(mobileError('9876543210')).toBeNull();
  });

  it('flags a wrong leading digit before length', () => {
    expect(mobileError('1234')).toMatch(/start with 6, 7, 8 or 9/);
  });

  it('flags an incomplete number', () => {
    expect(mobileError('98765')).toMatch(/all 10 digits/);
  });
});

describe('passwordError', () => {
  it('stays quiet while empty or long enough', () => {
    expect(passwordError('')).toBeNull();
    expect(passwordError('secret1')).toBeNull();
  });

  it('flags a short password', () => {
    expect(passwordError('abc')).toMatch(/at least 6/);
  });
});

import {
  isPasswordPairValid,
  isValidMobile,
  isValidUsername,
  mobileError,
  normalizeUsername,
  passwordError,
  usernameError,
} from '../validators';

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

describe('username and password pair', () => {
  it('normalizes typed usernames', () => {
    expect(normalizeUsername('Priya Nair!')).toBe('priyanair');
    expect(normalizeUsername('a'.repeat(30))).toHaveLength(20);
  });

  it('accepts 3–20 lowercase letters, numbers, dot and underscore only', () => {
    expect(isValidUsername('priya.nair_7')).toBe(true);
    expect(isValidUsername('ab')).toBe(false);
    expect(isValidUsername('Priya')).toBe(false);
    expect(usernameError('ab')).not.toBeNull();
    expect(usernameError('')).toBeNull();
  });

  it('requires matching passwords of minimum length', () => {
    expect(isPasswordPairValid('secret1', 'secret1')).toBe(true);
    expect(isPasswordPairValid('secret1', 'secret2')).toBe(false);
    expect(isPasswordPairValid('abc', 'abc')).toBe(false);
  });
});

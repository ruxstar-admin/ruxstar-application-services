import {
  isOldEnough,
  isPasswordPairValid,
  isValidMobile,
  isValidName,
  isValidUsername,
  mobileError,
  nameError,
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
  it('stays quiet while empty or valid', () => {
    expect(passwordError('')).toBeNull();
    expect(passwordError('secret12')).toBeNull();
  });

  it('flags a short password', () => {
    expect(passwordError('abc1')).toMatch(/at least 8/);
  });

  it('needs a letter and a number, like the API', () => {
    expect(passwordError('abcdefgh')).toMatch(/letter and one number/);
    expect(passwordError('12345678')).toMatch(/letter and one number/);
  });

  it('refuses the phone number inside the password', () => {
    expect(passwordError('a9876543210', '9876543210')).toMatch(/phone number/);
  });
});

describe('nameError and isOldEnough', () => {
  it('refuses a number typed as a name', () => {
    expect(nameError('9876543210')).toMatch(/not a number/);
    expect(nameError('Priya Nair')).toBeNull();
    expect(isValidName('P')).toBe(false);
  });

  it('needs 13 full years', () => {
    const now = new Date('2026-10-29T12:00:00Z');
    expect(isOldEnough('2013-10-29', now)).toBe(true);
    expect(isOldEnough('2013-10-30', now)).toBe(false);
    expect(isOldEnough('1899-12-31', now)).toBe(false);
    expect(isOldEnough('not-a-date', now)).toBe(false);
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

  it('requires matching passwords that pass the rules', () => {
    expect(isPasswordPairValid('secret12', 'secret12')).toBe(true);
    expect(isPasswordPairValid('secret12', 'secret13')).toBe(false);
    expect(isPasswordPairValid('abc', 'abc')).toBe(false);
  });
});
